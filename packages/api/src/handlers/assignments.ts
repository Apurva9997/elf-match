import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { assignments, db, exclusions, teamMembers, teams } from "../db/index.js";
import { getUserFromRequest } from "../lib/auth.js";
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

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateAssignments(
  memberIds: string[],
  exclusionPairs: Set<string>
): Map<string, string> | null {
  const maxAttempts = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const givers = [...memberIds];
    const receivers = shuffle([...memberIds]);

    let valid = true;
    const assignmentMap = new Map<string, string>();

    for (let i = 0; i < givers.length; i++) {
      const giver = givers[i];
      const receiver = receivers[i];

      if (giver === receiver) { valid = false; break; }

      const k1 = `${giver}:${receiver}`;
      const k2 = `${receiver}:${giver}`;
      if (exclusionPairs.has(k1) || exclusionPairs.has(k2)) {
        valid = false;
        break;
      }

      assignmentMap.set(giver, receiver);
    }

    if (valid) return assignmentMap;
  }

  return null;
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
      return error("Need at least 3 members to create assignments", 400);
    }

    const teamExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
    });

    const exclusionPairs = new Set<string>();
    for (const excl of teamExclusions) {
      exclusionPairs.add(`${excl.member1Id}:${excl.member2Id}`);
      if (excl.bidirectional) {
        exclusionPairs.add(`${excl.member2Id}:${excl.member1Id}`);
      }
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = confirmAssignmentSchema.safeParse(body);

    let assignmentMap: Map<string, string> | null = null;

    if (parsed.success && parsed.data.assignments) {
      const memberIds = new Set(members.map((m) => m.id));
      const providedAssignments = parsed.data.assignments;

      const providedGiverIds = new Set(providedAssignments.map((a) => a.giverId));
      const providedReceiverIds = new Set(providedAssignments.map((a) => a.receiverId));

      if (
        providedGiverIds.size !== memberIds.size ||
        providedReceiverIds.size !== memberIds.size ||
        ![...memberIds].every((id) => providedGiverIds.has(id)) ||
        ![...memberIds].every((id) => providedReceiverIds.has(id))
      ) {
        return error(
          "Provided assignments must include all team members exactly once",
          400
        );
      }

      assignmentMap = new Map<string, string>();
      for (const assignment of providedAssignments) {
        if (assignment.giverId === assignment.receiverId) {
          return error("Invalid assignment: member cannot be assigned to themselves", 400);
        }

        const k1 = `${assignment.giverId}:${assignment.receiverId}`;
        const k2 = `${assignment.receiverId}:${assignment.giverId}`;
        if (exclusionPairs.has(k1) || exclusionPairs.has(k2)) {
          return error("Invalid assignment: violates exclusion rule", 400);
        }

        assignmentMap.set(assignment.giverId, assignment.receiverId);
      }
    } else {
      const memberIds = members.map((m) => m.id);
      assignmentMap = generateAssignments(memberIds, exclusionPairs);

      if (!assignmentMap) {
        return error(
          "Could not generate valid assignments. This may happen if exclusion rules are too restrictive.",
          400
        );
      }
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) return notFound("Team not found");

    const assignmentRecords = [];
    for (const [giverId, receiverId] of assignmentMap) {
      const [assignment] = await db
        .insert(assignments)
        .values({ teamId, giverId, receiverId })
        .returning();
      assignmentRecords.push(assignment);

      const giver = members.find((m) => m.id === giverId);
      const receiver = members.find((m) => m.id === receiverId);

      if (giver?.user?.email && receiver?.user?.name) {
        try {
          await sendAssignmentEmail(giver.user.email, team.name, receiver.user.name);
        } catch (emailErr) {
          console.error(`Failed to send assignment email to ${giver.user.email}:`, emailErr);
        }
      }
    }

    await db
      .update(teams)
      .set({ status: "assigned", updatedAt: new Date() })
      .where(eq(teams.id, teamId));

    return success({
      message: "Assignments created successfully",
      count: assignmentRecords.length,
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
            user: { columns: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!assignment) {
      return success({ assigned: false, message: "Assignments have not been made yet." });
    }

    return success({
      assigned: true,
      giftee: {
        name: assignment.receiver.user?.name || "Unknown",
        avatarUrl: assignment.receiver.user?.avatarUrl,
      },
      giftStatus: assignment.giftStatus,
      revealedAt: assignment.revealedAt,
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

    return success(updated);
  } catch (err) {
    console.error("Error updating assignment:", err);
    return serverError("Failed to update assignment");
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
      return error("Need at least 3 members to create assignments", 400);
    }

    const teamExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
    });

    const exclusionPairs = new Set<string>();
    for (const excl of teamExclusions) {
      exclusionPairs.add(`${excl.member1Id}:${excl.member2Id}`);
      if (excl.bidirectional) {
        exclusionPairs.add(`${excl.member2Id}:${excl.member1Id}`);
      }
    }

    const memberIds = members.map((m) => m.id);
    const assignmentMap = generateAssignments(memberIds, exclusionPairs);

    if (!assignmentMap) {
      return error(
        "Could not generate valid assignments. This may happen if exclusion rules are too restrictive.",
        400
      );
    }

    const preview = [];
    for (const [giverId, receiverId] of assignmentMap) {
      const giver = members.find((m) => m.id === giverId);
      const receiver = members.find((m) => m.id === receiverId);

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
