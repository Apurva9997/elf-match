import { and, count, eq, or } from "drizzle-orm";
import { z } from "zod";
import { assignments, db, exclusions, teamMembers, teams } from "../db/index.js";
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
import { optionalIsoDateSchema } from "../lib/dates.js";
import { sanitizeTransform } from "../lib/sanitize.js";

const budgetField = z.number().positive().max(1_000_000);

function budgetOrder(
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
  ctx: z.RefinementCtx
) {
  if (
    budgetMin != null &&
    budgetMax != null &&
    budgetMin > budgetMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The minimum budget cannot be higher than the maximum.",
      path: ["budgetMin"],
    });
  }
}

function dateOrder(
  exchangeDate: string | null | undefined,
  wishlistDeadline: string | null | undefined,
  ctx: z.RefinementCtx
) {
  if (
    exchangeDate &&
    wishlistDeadline &&
    wishlistDeadline > exchangeDate
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The wishlist deadline cannot be after the exchange date.",
      path: ["wishlistDeadline"],
    });
  }
}

const createTeamSchema = z
  .object({
    name: z.string().min(1).max(255).transform(sanitizeTransform("text")),
    description: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeTransform("richText")(val) : val)),
    budgetMin: budgetField.optional(),
    budgetMax: budgetField.optional(),
    exchangeDate: optionalIsoDateSchema,
    wishlistDeadline: optionalIsoDateSchema,
  })
  .superRefine((data, ctx) => {
    budgetOrder(data.budgetMin, data.budgetMax, ctx);
    dateOrder(data.exchangeDate, data.wishlistDeadline, ctx);
  });

const updateTeamSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .transform((val) => (val ? sanitizeTransform("text")(val) : val)),
    description: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeTransform("richText")(val) : val)),
    budgetMin: budgetField.nullable().optional(),
    budgetMax: budgetField.nullable().optional(),
    exchangeDate: optionalIsoDateSchema,
    wishlistDeadline: optionalIsoDateSchema,
  })
  .superRefine((data, ctx) => {
    budgetOrder(data.budgetMin, data.budgetMax, ctx);
    dateOrder(data.exchangeDate, data.wishlistDeadline, ctx);
  });

async function _createTeam(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const body = JSON.parse(await req.text() || "{}");
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return error(
        parsed.error.issues[0]?.message || "Invalid team data",
        400,
        "VALIDATION_ERROR"
      );
    }

    const {
      name,
      description,
      budgetMin,
      budgetMax,
      exchangeDate,
      wishlistDeadline,
    } = parsed.data;

    const [team] = await db
      .insert(teams)
      .values({
        name,
        description,
        budgetMin: budgetMin?.toString(),
        budgetMax: budgetMax?.toString(),
        exchangeDate,
        wishlistDeadline,
        createdBy: user.id,
      })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      invitationStatus: "accepted",
      joinedAt: new Date(),
    });

    return success(team, 201);
  } catch (err) {
    console.error("Error creating team:", err);
    return serverError("Failed to create team");
  }
}

async function _listTeams(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const memberships = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.userId, user.id),
        or(
          eq(teamMembers.invitationStatus, "accepted"),
          eq(teamMembers.invitationStatus, "pending")
        )
      ),
      with: {
        team: {
          with: {
            creator: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    const teamsWithRole = memberships.map((m) => ({
      ...m.team,
      role: m.role,
      invitationStatus: m.invitationStatus,
      membershipId: m.id,
    }));

    return success(teamsWithRole);
  } catch (err) {
    console.error("Error listing teams:", err);
    return serverError("Failed to list teams");
  }
}

async function _getTeam(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        creator: { columns: { id: true, name: true } },
        members: {
          columns: {
            id: true,
            teamId: true,
            userId: true,
            role: true,
            invitationStatus: true,
            invitedEmail: true,
            invitationLinkToken: true,
            joinedAt: true,
          },
          with: {
            user: { columns: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!team) {
      return notFound("Team not found");
    }

    const isOrganizer = membership.role === "admin";
    return success({
      ...team,
      role: membership.role,
      membershipId: membership.id,
      members: team.members.map((member) => ({
        ...member,
        // A participant must not receive someone else's invitation link.
        invitationLinkToken: isOrganizer ? member.invitationLinkToken : null,
      })),
    });
  } catch (err) {
    console.error("Error getting team:", err);
    return serverError("Failed to get team");
  }
}

async function _updateTeam(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!membership) {
      return forbidden("Only admins can update team settings");
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return error(
        parsed.error.issues[0]?.message || "Invalid team data",
        400,
        "VALIDATION_ERROR"
      );
    }

    const data = parsed.data;

    const current = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
    if (!current) return notFound("Team not found");

    const nextMin =
      data.budgetMin !== undefined
        ? data.budgetMin
        : current.budgetMin
          ? Number(current.budgetMin)
          : null;
    const nextMax =
      data.budgetMax !== undefined
        ? data.budgetMax
        : current.budgetMax
          ? Number(current.budgetMax)
          : null;
    if (nextMin != null && nextMax != null && nextMin > nextMax) {
      return error(
        "The minimum budget cannot be higher than the maximum.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const nextExchange =
      data.exchangeDate !== undefined ? data.exchangeDate : current.exchangeDate;
    const nextDeadline =
      data.wishlistDeadline !== undefined
        ? data.wishlistDeadline
        : current.wishlistDeadline;
    if (nextExchange && nextDeadline && nextDeadline > nextExchange) {
      return error(
        "The wishlist deadline cannot be after the exchange date.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.budgetMin !== undefined)
      updates.budgetMin = data.budgetMin?.toString() ?? null;
    if (data.budgetMax !== undefined)
      updates.budgetMax = data.budgetMax?.toString() ?? null;
    if (data.exchangeDate !== undefined) updates.exchangeDate = data.exchangeDate;
    if (data.wishlistDeadline !== undefined)
      updates.wishlistDeadline = data.wishlistDeadline;

    const [updatedTeam] = await db
      .update(teams)
      .set(updates)
      .where(eq(teams.id, teamId))
      .returning();

    return success(updatedTeam);
  } catch (err) {
    console.error("Error updating team:", err);
    return serverError("Failed to update team");
  }
}

async function _deleteTeam(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!membership) {
      return forbidden("Only admins can delete the team");
    }

    // Assignments and exclusions point at members without cascading,
    // so they have to go before the exchange itself.
    await db.delete(assignments).where(eq(assignments.teamId, teamId));
    await db.delete(exclusions).where(eq(exclusions.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));

    return success({ message: "Team deleted" });
  } catch (err) {
    console.error("Error deleting team:", err);
    return serverError("Failed to delete team");
  }
}

async function _getTeamStatus(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound("Team not found");
    }

    const acceptedMembers = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: {
        user: { with: { address: true } },
        wishlist: { with: { items: true } },
      },
    });

    const acceptedMembersCount = acceptedMembers.length;
    const membersWithWishlist = acceptedMembers.filter(
      (m) => m.wishlist && m.wishlist.items.length > 0
    ).length;
    const membersWithAddress = acceptedMembers.filter(
      (m) => m.user?.address
    ).length;

    const [assignmentCount] = await db
      .select({ count: count() })
      .from(assignments)
      .where(eq(assignments.teamId, teamId));

    const hasAssignments = (assignmentCount?.count ?? 0) > 0;

    const [pendingCount] = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.invitationStatus, "pending")
        )
      );

    return success({
      status: team.status,
      totalMembers: acceptedMembersCount,
      membersWithWishlist,
      membersWithAddress,
      pendingInvitations: pendingCount?.count ?? 0,
      hasAssignments,
      canAssign: acceptedMembersCount >= 3 && !hasAssignments,
      assignmentEmailsPending: hasAssignments
        ? (
            await db.query.assignments.findMany({
              where: eq(assignments.teamId, teamId),
            })
          ).filter((row) => !row.revealedAt).length
        : 0,
      completionPercentage:
        acceptedMembersCount > 0
          ? Math.round(
              ((membersWithWishlist + membersWithAddress) /
                (acceptedMembersCount * 2)) *
                100
            )
          : 0,
    });
  } catch (err) {
    console.error("Error getting team status:", err);
    return serverError("Failed to get team status");
  }
}

export const createTeam = wrapHandler(_createTeam, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const listTeams = wrapHandler(_listTeams, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const getTeam = wrapHandler(_getTeam, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const updateTeam = wrapHandler(_updateTeam, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const deleteTeam = wrapHandler(_deleteTeam, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const getTeamStatus = wrapHandler(_getTeamStatus, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});
