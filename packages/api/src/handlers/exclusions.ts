import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { assignments, db, exclusions, teamMembers } from "../db/index.js";
import { exclusionEdges, explainBlockedDraw } from "../lib/draw.js";
import { getUserFromRequest } from "../lib/auth.js";
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
import { sanitizeTransform } from "../lib/sanitize.js";

const addExclusionSchema = z.object({
  member1Id: z.string().uuid(),
  member2Id: z.string().uuid(),
  reason: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val ? sanitizeTransform("text")(val) : val)),
  bidirectional: z.boolean().default(true),
});

async function isTeamAdmin(userId: string, teamId: string) {
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.invitationStatus, "accepted"),
      eq(teamMembers.role, "admin")
    ),
  });
  return !!membership;
}

async function _listExclusions(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    if (!(await isTeamAdmin(user.id, teamId))) {
      return forbidden("Only admins can view exclusions");
    }

    const teamExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
      with: {
        member1: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        member2: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return success(teamExclusions);
  } catch (err) {
    console.error("Error listing exclusions:", err);
    return serverError("Failed to list exclusions");
  }
}

async function _addExclusion(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    if (!(await isTeamAdmin(user.id, teamId))) {
      return forbidden("Only admins can add exclusions");
    }

    const existingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });

    if (existingAssignments.length > 0) {
      return error(
        "Cannot add exclusions after assignments have been made",
        400
      );
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = addExclusionSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid exclusion data", 400, "VALIDATION_ERROR");
    }

    const { member1Id, member2Id, reason, bidirectional } = parsed.data;

    if (member1Id === member2Id) {
      return error("Cannot exclude a member from themselves", 400);
    }

    const member1 = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, member1Id),
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    const member2 = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, member2Id),
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    if (!member1 || !member2) {
      return error("One or both members not found in this team", 400);
    }

    const existing = await db.query.exclusions.findFirst({
      where: and(
        eq(exclusions.teamId, teamId),
        or(
          and(
            eq(exclusions.member1Id, member1Id),
            eq(exclusions.member2Id, member2Id)
          ),
          and(
            eq(exclusions.member1Id, member2Id),
            eq(exclusions.member2Id, member1Id)
          )
        )
      ),
    });

    if (existing) {
      return error("This exclusion already exists", 400);
    }

    const accepted = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });
    const existingRules = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
    });
    const blocked = exclusionEdges([
      ...existingRules,
      { member1Id, member2Id, bidirectional },
    ]);
    const blockedReason = explainBlockedDraw(
      accepted.map((member) => member.id),
      blocked
    );

    const [exclusion] = await db
      .insert(exclusions)
      .values({
        teamId,
        member1Id,
        member2Id,
        reason,
        bidirectional,
      })
      .returning();

    return success(
      {
        ...exclusion,
        warning: blockedReason,
      },
      201
    );
  } catch (err) {
    console.error("Error adding exclusion:", err);
    return serverError("Failed to add exclusion");
  }
}

async function _removeExclusion(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const { teamId, exclusionId } = params;
    if (!teamId || !exclusionId)
      return error("Team ID and Exclusion ID required", 400);

    if (!(await isTeamAdmin(user.id, teamId))) {
      return forbidden("Only admins can remove exclusions");
    }

    const existingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });

    if (existingAssignments.length > 0) {
      return error(
        "Cannot remove exclusions after assignments have been made",
        400
      );
    }

    const exclusion = await db.query.exclusions.findFirst({
      where: and(eq(exclusions.id, exclusionId), eq(exclusions.teamId, teamId)),
    });

    if (!exclusion) {
      return notFound("Exclusion not found");
    }

    await db.delete(exclusions).where(eq(exclusions.id, exclusionId));

    return success({ message: "Exclusion removed" });
  } catch (err) {
    console.error("Error removing exclusion:", err);
    return serverError("Failed to remove exclusion");
  }
}

export const listExclusions = wrapHandler(_listExclusions, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const addExclusion = wrapHandler(_addExclusion, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const removeExclusion = wrapHandler(_removeExclusion, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});
