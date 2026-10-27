import { and, eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  assignments,
  db,
  exclusions,
  teamMembers,
  teams,
  users,
} from "../db/index.js";
import { getUserFromRequest } from "../lib/auth.js";
import { sendInvitationEmail } from "../lib/email.js";
import { hashToken } from "../lib/encryption.js";
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

const inviteMembersSchema = z.object({
  emails: z
    .array(z.string().email().transform(sanitizeTransform("email")))
    .min(1)
    .max(50),
});

async function _inviteMembers(
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
      return forbidden("Only admins can invite members");
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = inviteMembersSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid email list", 400, "VALIDATION_ERROR");
    }

    const { emails } = parsed.data;

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

        const token = uuidv4();
        const tokenHash = hashToken(token);
        await db.insert(teamMembers).values({
          teamId,
          userId: existingUser?.id,
          invitedEmail: normalizedEmail,
          invitationToken: tokenHash,
          invitationStatus: "pending",
          role: "member",
        });

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

async function _previewInvitation(
  _req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const token = params.token;
    if (!token) return error("Invitation token required", 400);

    const invitation = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.invitationToken, hashToken(token)),
      with: {
        team: {
          with: { creator: { columns: { name: true } } },
        },
      },
    });

    if (!invitation?.team) {
      return notFound("Invitation not found or already used");
    }

    const host = invitation.team.creator?.name?.split(" ")[0] || "The organizer";

    return success({
      status: invitation.invitationStatus,
      exchangeName: invitation.team.name,
      hostName: host,
      exchangeDate: invitation.team.exchangeDate,
      wishlistDeadline: invitation.team.wishlistDeadline,
      budgetMin: invitation.team.budgetMin,
      budgetMax: invitation.team.budgetMax,
    });
  } catch (err) {
    console.error("Error previewing invitation:", err);
    return serverError("Failed to open invitation");
  }
}

async function _acceptInvitation(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const token = params.token;
    if (!token) return error("Invitation token required", 400);

    const tokenHash = hashToken(token);

    const invitation = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.invitationToken, tokenHash),
        eq(teamMembers.invitationStatus, "pending")
      ),
      with: { team: true },
    });

    if (!invitation) {
      return notFound("Invitation not found or already used");
    }

    if (
      invitation.invitedEmail &&
      invitation.invitedEmail !== user.email.toLowerCase()
    ) {
      return forbidden("This invitation was sent to a different email address");
    }

    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, invitation.teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    if (existingMembership) {
      await db.delete(teamMembers).where(eq(teamMembers.id, invitation.id));
      return success({ team: invitation.team, message: "Already a member" });
    }

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

async function _declineInvitation(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const token = params.token;
    if (!token) return error("Invitation token required", 400);

    const tokenHash = hashToken(token);

    const invitation = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.invitationToken, tokenHash),
        eq(teamMembers.invitationStatus, "pending")
      ),
    });

    if (!invitation) {
      return notFound("Invitation not found or already used");
    }

    if (
      invitation.invitedEmail &&
      invitation.invitedEmail !== user.email.toLowerCase()
    ) {
      return forbidden("This invitation was sent to a different email address");
    }

    await db
      .update(teamMembers)
      .set({ invitationStatus: "declined", invitationToken: null })
      .where(eq(teamMembers.id, invitation.id));

    return success({ message: "Invitation declined" });
  } catch (err) {
    console.error("Error declining invitation:", err);
    return serverError("Failed to decline invitation");
  }
}

async function _removeMember(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const { teamId, memberId } = params;
    if (!teamId || !memberId)
      return error("Team ID and Member ID required", 400);

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

    const memberToRemove = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)),
    });

    if (!memberToRemove) {
      return notFound("Member not found");
    }

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

    await db
      .delete(assignments)
      .where(
        or(
          eq(assignments.giverId, memberId),
          eq(assignments.receiverId, memberId)
        )
      );
    await db
      .delete(exclusions)
      .where(
        or(
          eq(exclusions.member1Id, memberId),
          eq(exclusions.member2Id, memberId)
        )
      );
    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

    return success({ message: "Member removed" });
  } catch (err) {
    console.error("Error removing member:", err);
    return serverError("Failed to remove member");
  }
}

async function _listPendingInvitations(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

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
            creator: { columns: { id: true, name: true } },
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

async function _acceptInvitationDirect(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const invitationId = params.invitationId;
    if (!invitationId) return error("Invitation ID required", 400);

    const invitation = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, invitationId),
        eq(teamMembers.invitationStatus, "pending"),
        or(
          eq(teamMembers.invitedEmail, user.email.toLowerCase()),
          eq(teamMembers.userId, user.id)
        )
      ),
      with: { team: true },
    });

    if (!invitation) {
      return notFound("Invitation not found or not for this user");
    }

    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, invitation.teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted")
      ),
    });

    if (existingMembership) {
      await db.delete(teamMembers).where(eq(teamMembers.id, invitation.id));
      return success({ team: invitation.team, message: "Already a member" });
    }

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

async function _declineInvitationDirect(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const invitationId = params.invitationId;
    if (!invitationId) return error("Invitation ID required", 400);

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

    await db
      .update(teamMembers)
      .set({ invitationStatus: "declined", invitationToken: null })
      .where(eq(teamMembers.id, invitation.id));

    return success({ message: "Invitation declined" });
  } catch (err) {
    console.error("Error declining invitation directly:", err);
    return serverError("Failed to decline invitation");
  }
}

async function _resendInvitation(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const { teamId, memberId } = params;
    if (!teamId || !memberId)
      return error("Team ID and Member ID required", 400);

    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!adminMembership) {
      return forbidden("Only admins can resend invitations");
    }

    const pendingMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, memberId),
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "pending")
      ),
    });

    if (!pendingMember) {
      return notFound("Pending invitation not found");
    }

    if (!pendingMember.invitedEmail) {
      return error("No email address for this invitation", 400);
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound("Team not found");
    }

    const token = uuidv4();
    const tokenHash = hashToken(token);

    await db
      .update(teamMembers)
      .set({ invitationToken: tokenHash, invitedAt: new Date() })
      .where(eq(teamMembers.id, memberId));

    await sendInvitationEmail(
      pendingMember.invitedEmail,
      team.name,
      user.name || user.email,
      token
    );

    return success({ message: "Invitation resent successfully" });
  } catch (err) {
    console.error("Error resending invitation:", err);
    return serverError("Failed to resend invitation");
  }
}

export const inviteMembers = wrapHandler(_inviteMembers, {
  limiter: rateLimiters.inviteMembers,
  useUserId: true,
});

export const previewInvitation = wrapHandler(_previewInvitation, {
  limiter: rateLimiters.authenticatedRead,
});
export const acceptInvitation = wrapHandler(_acceptInvitation, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const declineInvitation = wrapHandler(_declineInvitation, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: false,
});

export const removeMember = wrapHandler(_removeMember, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const listPendingInvitations = wrapHandler(_listPendingInvitations, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const acceptInvitationDirect = wrapHandler(_acceptInvitationDirect, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const declineInvitationDirect = wrapHandler(_declineInvitationDirect, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const resendInvitation = wrapHandler(_resendInvitation, {
  limiter: rateLimiters.inviteMembers,
  useUserId: true,
});
