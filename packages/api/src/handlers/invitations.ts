import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { and, eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db, teamMembers, teams, users } from "../db/index.js";
import { getUserFromEvent } from "../lib/auth.js";
import { sendInvitationEmail } from "../lib/email.js";
import { hashToken } from "../lib/encryption.js";
import {
  error,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "../lib/response.js";

const inviteMembersSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
});

export async function inviteMembers(
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
      return forbidden("Only admins can invite members");
    }

    const body = JSON.parse(event.body || "{}");
    const parsed = inviteMembersSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid email list", 400, "VALIDATION_ERROR");
    }

    const { emails } = parsed.data;

    // Get team details for email
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound("Team not found");
    }

    const results: Array<{ email: string; status: string; error?: string }> =
      [];

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase();

      try {
        // Check if already a member or invited
        const existingMember = await db.query.teamMembers.findFirst({
          where: and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.invitedEmail, normalizedEmail)
          ),
        });

        if (existingMember) {
          results.push({ email: normalizedEmail, status: "already_invited" });
          continue;
        }

        // Check if user exists and is already a member
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, normalizedEmail),
        });

        if (existingUser) {
          const existingUserMember = await db.query.teamMembers.findFirst({
            where: and(
              eq(teamMembers.teamId, teamId),
              eq(teamMembers.userId, existingUser.id)
            ),
          });

          if (existingUserMember) {
            results.push({ email: normalizedEmail, status: "already_member" });
            continue;
          }
        }

        // Create invitation with hashed token
        const token = uuidv4();
        const tokenHash = hashToken(token); // Store hash, not the actual token
        await db.insert(teamMembers).values({
          teamId,
          userId: existingUser?.id,
          invitedEmail: normalizedEmail,
          invitationToken: tokenHash,
          invitationStatus: "pending",
          role: "member",
        });

        // Send the actual token to the user via email
        await sendInvitationEmail(
          normalizedEmail,
          team.name,
          user.name || user.email,
          token
        );

        results.push({ email: normalizedEmail, status: "invited" });
      } catch (err) {
        console.error(`Error inviting ${normalizedEmail}:`, err);
        results.push({
          email: normalizedEmail,
          status: "error",
          error: "Failed to send invitation",
        });
      }
    }

    return success({ results });
  } catch (err) {
    console.error("Error inviting members:", err);
    return serverError("Failed to invite members");
  }
}

export async function acceptInvitation(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const token = event.pathParameters?.token;
    if (!token) return error("Invitation token required", 400);

    // Hash the provided token to compare with stored hash
    const tokenHash = hashToken(token);

    // Find the invitation using the hash
    const invitation = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.invitationToken, tokenHash),
        eq(teamMembers.invitationStatus, "pending")
      ),
      with: {
        team: true,
      },
    });

    if (!invitation) {
      return notFound("Invitation not found or already used");
    }

    // Verify email matches (if invitation was for a specific email)
    if (
      invitation.invitedEmail &&
      invitation.invitedEmail !== user.email.toLowerCase()
    ) {
      return forbidden("This invitation was sent to a different email address");
    }

    // Check if user is already a member
    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, invitation.teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    if (existingMembership) {
      // Delete the pending invitation since user is already a member
      await db.delete(teamMembers).where(eq(teamMembers.id, invitation.id));
      return success({ team: invitation.team, message: "Already a member" });
    }

    // Accept the invitation
    await db
      .update(teamMembers)
      .set({
        userId: user.id,
        invitationStatus: "accepted",
        invitationToken: null,
        joinedAt: new Date(),
      })
      .where(eq(teamMembers.id, invitation.id));

    return success({ team: invitation.team, message: "Invitation accepted" });
  } catch (err) {
    console.error("Error accepting invitation:", err);
    return serverError("Failed to accept invitation");
  }
}

export async function declineInvitation(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const token = event.pathParameters?.token;
    if (!token) return error("Invitation token required", 400);

    // Hash the provided token to compare with stored hash
    const tokenHash = hashToken(token);

    // Find the invitation using the hash
    const invitation = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.invitationToken, tokenHash),
        eq(teamMembers.invitationStatus, "pending")
      ),
    });

    if (!invitation) {
      return notFound("Invitation not found or already used");
    }

    // Update status to declined
    await db
      .update(teamMembers)
      .set({
        invitationStatus: "declined",
        invitationToken: null,
      })
      .where(eq(teamMembers.id, invitation.id));

    return success({ message: "Invitation declined" });
  } catch (err) {
    console.error("Error declining invitation:", err);
    return serverError("Failed to decline invitation");
  }
}

export async function removeMember(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    const memberId = event.pathParameters?.memberId;
    if (!teamId || !memberId)
      return error("Team ID and Member ID required", 400);

    // Check admin membership
    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!adminMembership) {
      return forbidden("Only admins can remove members");
    }

    // Find the member to remove
    const memberToRemove = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)),
    });

    if (!memberToRemove) {
      return notFound("Member not found");
    }

    // Cannot remove yourself if you're the only admin
    if (memberToRemove.userId === user.id) {
      const otherAdmins = await db.query.teamMembers.findMany({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.role, "admin"),
          eq(teamMembers.invitationStatus, "accepted")
        ),
      });

      if (otherAdmins.length <= 1) {
        return error(
          "Cannot remove yourself as the only admin. Transfer admin rights first.",
          400
        );
      }
    }

    // Delete the member
    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

    return success({ message: "Member removed" });
  } catch (err) {
    console.error("Error removing member:", err);
    return serverError("Failed to remove member");
  }
}

export async function listPendingInvitations(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    // Find pending invitations where:
    // 1. invitedEmail matches user's email, OR
    // 2. userId matches user's id (for cases where user was known at invite time)
    const pendingInvitations = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.invitationStatus, "pending"),
        or(
          eq(teamMembers.invitedEmail, user.email.toLowerCase()),
          eq(teamMembers.userId, user.id)
        )
      ),
      with: {
        team: {
          with: {
            creator: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const invitations = pendingInvitations.map((inv) => ({
      id: inv.id,
      teamId: inv.teamId,
      teamName: inv.team.name,
      teamDescription: inv.team.description,
      invitedAt: inv.invitedAt,
      invitedBy: inv.team.creator,
    }));

    return success(invitations);
  } catch (err) {
    console.error("Error listing pending invitations:", err);
    return serverError("Failed to list pending invitations");
  }
}

export async function acceptInvitationDirect(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const invitationId = event.pathParameters?.invitationId;
    if (!invitationId) return error("Invitation ID required", 400);

    // Find the invitation
    const invitation = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, invitationId),
        eq(teamMembers.invitationStatus, "pending"),
        or(
          eq(teamMembers.invitedEmail, user.email.toLowerCase()),
          eq(teamMembers.userId, user.id)
        )
      ),
      with: {
        team: true,
      },
    });

    if (!invitation) {
      return notFound("Invitation not found or not for this user");
    }

    // Check if user is already a member through another invitation
    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, invitation.teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    if (existingMembership) {
      // Delete the pending invitation since user is already a member
      await db.delete(teamMembers).where(eq(teamMembers.id, invitation.id));
      return success({ team: invitation.team, message: "Already a member" });
    }

    // Accept the invitation
    await db
      .update(teamMembers)
      .set({
        userId: user.id,
        invitationStatus: "accepted",
        invitationToken: null,
        joinedAt: new Date(),
      })
      .where(eq(teamMembers.id, invitation.id));

    return success({ team: invitation.team, message: "Invitation accepted" });
  } catch (err) {
    console.error("Error accepting invitation directly:", err);
    return serverError("Failed to accept invitation");
  }
}

export async function declineInvitationDirect(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const invitationId = event.pathParameters?.invitationId;
    if (!invitationId) return error("Invitation ID required", 400);

    // Find the invitation
    const invitation = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, invitationId),
        eq(teamMembers.invitationStatus, "pending"),
        or(
          eq(teamMembers.invitedEmail, user.email.toLowerCase()),
          eq(teamMembers.userId, user.id)
        )
      ),
    });

    if (!invitation) {
      return notFound("Invitation not found or not for this user");
    }

    // Update status to declined
    await db
      .update(teamMembers)
      .set({
        invitationStatus: "declined",
        invitationToken: null,
      })
      .where(eq(teamMembers.id, invitation.id));

    return success({ message: "Invitation declined" });
  } catch (err) {
    console.error("Error declining invitation directly:", err);
    return serverError("Failed to decline invitation");
  }
}
