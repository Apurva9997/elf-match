import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { and, count, eq, or } from "drizzle-orm";
import { z } from "zod";
import { assignments, db, teamMembers, teams } from "../db/index.js";
import { getUserFromEvent } from "../lib/auth.js";
import {
  error,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "../lib/response.js";

const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  exchangeDate: z.string().optional(),
  wishlistDeadline: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  budgetMin: z.number().positive().nullable().optional(),
  budgetMax: z.number().positive().nullable().optional(),
  exchangeDate: z.string().nullable().optional(),
  wishlistDeadline: z.string().nullable().optional(),
});

export async function createTeam(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const body = JSON.parse(event.body || "{}");
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid team data", 400, "VALIDATION_ERROR");
    }

    const {
      name,
      description,
      budgetMin,
      budgetMax,
      exchangeDate,
      wishlistDeadline,
    } = parsed.data;

    // Create team
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

    // Add creator as admin member
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

export async function listTeams(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    // Get all teams the user is a member of
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
              columns: {
                id: true,
                name: true,
              },
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

export async function getTeam(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    // Check membership
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

    // Get team with members
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
          },
        },
        members: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return notFound("Team not found");
    }

    return success({
      ...team,
      role: membership.role,
      membershipId: membership.id,
    });
  } catch (err) {
    console.error("Error getting team:", err);
    return serverError("Failed to get team");
  }
}

export async function updateTeam(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    // Check admin membership
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

    const body = JSON.parse(event.body || "{}");
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid team data", 400, "VALIDATION_ERROR");
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const data = parsed.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.budgetMin !== undefined)
      updates.budgetMin = data.budgetMin?.toString() ?? null;
    if (data.budgetMax !== undefined)
      updates.budgetMax = data.budgetMax?.toString() ?? null;
    if (data.exchangeDate !== undefined)
      updates.exchangeDate = data.exchangeDate;
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

export async function deleteTeam(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    // Check admin membership
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

    await db.delete(teams).where(eq(teams.id, teamId));

    return success({ message: "Team deleted" });
  } catch (err) {
    console.error("Error deleting team:", err);
    return serverError("Failed to delete team");
  }
}

export async function getTeamStatus(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    // Check membership
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

    // Get team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound("Team not found");
    }

    // Get all members count (accepted + pending)
    const [allMembersCount] = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    const totalMembers = allMembersCount?.count ?? 0;

    // Get accepted members for wishlist/address counts and completion percentage
    const acceptedMembers = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: {
        user: true,
        wishlist: {
          with: {
            items: true,
          },
        },
        address: true,
      },
    });

    const acceptedMembersCount = acceptedMembers.length;
    const membersWithWishlist = acceptedMembers.filter(
      (m) => m.wishlist && m.wishlist.items.length > 0
    ).length;
    const membersWithAddress = acceptedMembers.filter((m) => m.address).length;

    // Check if assignments exist
    const [assignmentCount] = await db
      .select({ count: count() })
      .from(assignments)
      .where(eq(assignments.teamId, teamId));

    const hasAssignments = (assignmentCount?.count ?? 0) > 0;

    // Get pending invitations count
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
      totalMembers,
      membersWithWishlist,
      membersWithAddress,
      pendingInvitations: pendingCount?.count ?? 0,
      hasAssignments,
      canAssign: acceptedMembersCount >= 3 && !hasAssignments,
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
