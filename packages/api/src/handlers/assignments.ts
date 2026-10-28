import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { assignments, db, exclusions, teamMembers, teams } from "../db/index.js";
import { getUserFromRequest } from "../lib/auth.js";
import {
  exclusionEdges,
  explainBlockedDraw,
  findDerangement,
  validateProvidedPairs,
  type Pair,
} from "../lib/draw.js";
import { sendAssignmentEmail } from "../lib/email.js";
import { type RouteParams, wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import {
  error,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "../lib/response.js";

const updateAssignmentSchema = z.object({
  giftStatus: z.enum(["pending", "purchased", "shipped", "delivered"]),
});

const confirmAssignmentSchema = z.object({
  assignments: z
    .array(
      z.object({
        giverId: z.string().uuid(),
        receiverId: z.string().uuid(),
      })
    )
    .optional(),
});

async function getMembershipForTeam(userId: string, teamId: string) {
  return db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.invitationStatus, "accepted")
    ),
  });
}

type DrawMember = {
  id: string;
  invitedEmail: string | null;
  user: {
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
};

function memberName(member: DrawMember | undefined): string {
  return member?.user?.name || member?.invitedEmail || "Someone in the exchange";
}

function blockedDrawMessage(memberIds: string[], blocked: Set<string>): string {
  return (
    explainBlockedDraw(memberIds, blocked) ||
    "These exclusions leave no way for everyone to give and receive exactly once. Remove one exclusion, or invite another person."
  );
}

async function notifyAssignments(
  teamId: string,
  teamName: string,
  records: Array<{ giverId: string; receiverId: string; revealedAt: Date | null }>
): Promise<{ notified: string[]; failed: string[] }> {
  const memberIds = [
    ...new Set(records.flatMap((record) => [record.giverId, record.receiverId])),
  ];
  const members = await db.query.teamMembers.findMany({
    where: inArray(teamMembers.id, memberIds),
    with: { user: true },
  });
  const byId = new Map(members.map((member) => [member.id, member]));

  const notified: string[] = [];
  const failed: string[] = [];

  for (const record of records) {
    if (record.revealedAt) continue;
    const giver = byId.get(record.giverId);
    const receiver = byId.get(record.receiverId);
    const email = giver?.user?.email;
    if (!email) {
      failed.push(giver?.invitedEmail || record.giverId);
      continue;
    }

    try {
      await sendAssignmentEmail(
        email,
        teamName,
        memberName(receiver),
        teamId
      );
      await db
        .update(assignments)
        .set({ revealedAt: new Date() })
        .where(
          and(
            eq(assignments.teamId, teamId),
            eq(assignments.giverId, record.giverId)
          )
        );
      notified.push(email);
    } catch (emailErr) {
      console.error(`Failed to send assignment email to ${email}:`, emailErr);
      failed.push(email);
    }
  }

  return { notified, failed };
}

async function _triggerAssignment(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!adminMembership) {
      return forbidden("Only admins can trigger assignments");
    }

    const existingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });

    if (existingAssignments.length > 0) {
      return error("Assignments have already been made for this team", 400);
    }

    const members = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: { user: true },
    });

    if (members.length < 3) {
      return error("A draw needs at least three people who have joined.", 400);
    }

    const teamExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
    });
    const blocked = exclusionEdges(teamExclusions);
    const memberIds = members.map((member) => member.id);

    const body = JSON.parse(await req.text() || "{}");
    const parsed = confirmAssignmentSchema.safeParse(body);
    const provided = parsed.success ? parsed.data.assignments : undefined;

    let pairs: Pair[];
    if (provided) {
      const checked = validateProvidedPairs(memberIds, blocked, provided);
      if (!checked.ok) return error(checked.reason, 409, "STALE_PREVIEW");
      pairs = provided;
    } else {
      const generated = findDerangement(memberIds, blocked);
      if (!generated) {
        return error(blockedDrawMessage(memberIds, blocked), 400, "DRAW_IMPOSSIBLE");
      }
      pairs = generated;
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
    if (!team) return notFound("Team not found");
    if (team.archivedAt) return error("This exchange is archived.", 409);

    // Commit the whole draw or none of it. A second confirm that arrives
    // while this one is writing hits the giver unique index and rolls back.
    let committed: Array<{
      giverId: string;
      receiverId: string;
      revealedAt: Date | null;
    }>;
    try {
      committed = await db.transaction(async (tx) => {
        const already = await tx.query.assignments.findMany({
          where: eq(assignments.teamId, teamId),
        });
        if (already.length > 0) {
          throw new Error("ALREADY_ASSIGNED");
        }

        const inserted = [];
        for (const pair of pairs) {
          const [row] = await tx
            .insert(assignments)
            .values({
              teamId,
              giverId: pair.giverId,
              receiverId: pair.receiverId,
            })
            .returning();
          inserted.push(row);
        }

        await tx
          .update(teams)
          .set({ status: "assigned", updatedAt: new Date() })
          .where(eq(teams.id, teamId));

        return inserted;
      });
    } catch (commitErr) {
      if (commitErr instanceof Error && commitErr.message === "ALREADY_ASSIGNED") {
        return error("Assignments have already been made for this team", 400);
      }
      const code =
        commitErr && typeof commitErr === "object" && "code" in commitErr
          ? String((commitErr as { code?: unknown }).code)
          : "";
      if (code === "23505") {
        return error(
          "Assignments have already been made for this team",
          400
        );
      }
      throw commitErr;
    }

    const delivery = await notifyAssignments(teamId, team.name, committed);

    return success({
      message:
        delivery.failed.length > 0
          ? "Assignments are saved. Some emails did not send — use Send the missing emails."
          : "Assignments created successfully",
      count: committed.length,
      notified: delivery.notified.length,
      failed: delivery.failed,
    });
  } catch (err) {
    console.error("Error triggering assignment:", err);
    return serverError("Failed to create assignments");
  }
}

async function _getAssignment(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) return forbidden("You are not a member of this team");

    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.teamId, teamId),
        eq(assignments.giverId, membership.id)
      ),
      with: {
        receiver: {
          with: {
            user: {
              columns: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      return success({ assigned: false, message: "Assignments have not been made yet." });
    }

    // viewedAt is the screen open. revealedAt is the email delivery, and
    // the missing-email count depends on it staying untouched here.
    const firstView = !assignment.viewedAt;
    if (firstView) {
      await db
        .update(assignments)
        .set({ viewedAt: new Date() })
        .where(eq(assignments.id, assignment.id));
    }

    return success({
      assigned: true,
      giftee: {
        name: assignment.receiver.user?.name || "Name not shared",
        avatarUrl: assignment.receiver.user?.avatarUrl,
      },
      giftStatus: assignment.giftStatus,
      revealedAt: assignment.revealedAt,
      firstView,
    });
  } catch (err) {
    console.error("Error getting assignment:", err);
    return serverError("Failed to get assignment");
  }
}

async function _updateAssignment(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) return forbidden("You are not a member of this team");

    const body = JSON.parse(await req.text() || "{}");
    const parsed = updateAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid assignment data", 400, "VALIDATION_ERROR");
    }

    const { giftStatus } = parsed.data;

    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.teamId, teamId),
        eq(assignments.giverId, membership.id)
      ),
    });

    if (!assignment) return notFound("Assignment not found");

    const [updated] = await db
      .update(assignments)
      .set({ giftStatus })
      .where(eq(assignments.id, assignment.id))
      .returning();

    return success({
      id: updated.id,
      giftStatus: updated.giftStatus,
    });
  } catch (err) {
    console.error("Error updating assignment:", err);
    return serverError("Failed to update assignment");
  }
}

async function _retryAssignmentEmails(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });
    if (!adminMembership) {
      return forbidden("Only the organizer can resend assignment emails");
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
    if (!team) return notFound("Team not found");

    const existing = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });
    if (existing.length === 0) {
      return error("Assignments have not been made yet", 400);
    }

    const pending = existing.filter((row) => !row.revealedAt);
    if (pending.length === 0) {
      return success({
        message: "Everyone who has an assignment was already emailed.",
        notified: 0,
        failed: [],
      });
    }

    const delivery = await notifyAssignments(teamId, team.name, pending);
    return success({
      message:
        delivery.failed.length > 0
          ? "Some assignment emails still did not send. Try again in a few minutes."
          : "The missing assignment emails were sent.",
      notified: delivery.notified.length,
      failed: delivery.failed,
    });
  } catch (err) {
    console.error("Error resending assignment emails:", err);
    return serverError("Failed to resend assignment emails");
  }
}

async function _previewAssignment(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!adminMembership) return forbidden("Only admins can preview assignments");

    const previewTeam = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      columns: { archivedAt: true },
    });
    if (previewTeam?.archivedAt) return error("This exchange is archived.", 409);

    const existingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });

    if (existingAssignments.length > 0) {
      return error("Assignments have already been made for this team", 400);
    }

    const members = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: { user: true },
    });

    if (members.length < 3) {
      return error("A draw needs at least three people who have joined.", 400);
    }

    const teamExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
    });
    const blocked = exclusionEdges(teamExclusions);
    const memberIds = members.map((member) => member.id);
    const pairs = findDerangement(memberIds, blocked);

    if (!pairs) {
      return error(blockedDrawMessage(memberIds, blocked), 400, "DRAW_IMPOSSIBLE");
    }

    const preview = [];
    for (const pair of pairs) {
      const giver = members.find((member) => member.id === pair.giverId);
      const receiver = members.find((member) => member.id === pair.receiverId);
      const giverId = pair.giverId;
      const receiverId = pair.receiverId;

      preview.push({
        giver: {
          id: giverId,
          name: giver?.user?.name || giver?.invitedEmail || "Unknown",
          avatarUrl: giver?.user?.avatarUrl,
        },
        receiver: {
          id: receiverId,
          name: receiver?.user?.name || receiver?.invitedEmail || "Unknown",
          avatarUrl: receiver?.user?.avatarUrl,
        },
      });
    }

    return success({
      preview,
      totalAssignments: preview.length,
      exclusionsApplied: teamExclusions.length,
    });
  } catch (err) {
    console.error("Error previewing assignment:", err);
    return serverError("Failed to preview assignments");
  }
}

export const triggerAssignment = wrapHandler(_triggerAssignment, {
  limiter: rateLimiters.assignment,
  useUserId: true,
});

export const getAssignment = wrapHandler(_getAssignment, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const updateAssignment = wrapHandler(_updateAssignment, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const previewAssignment = wrapHandler(_previewAssignment, {
  limiter: rateLimiters.assignment,
  useUserId: true,
});

export const retryAssignmentEmails = wrapHandler(_retryAssignmentEmails, {
  limiter: rateLimiters.assignment,
  useUserId: true,
});
