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
import { notifyOrganizerOfJoin } from "../lib/join-notice.js";
import { hashToken } from "../lib/encryption.js";
import {
  expireShareLink,
  generateShareLink,
  joinByShareLink,
  listShareLinks,
  resolveShareLink,
  setShareSigning,
  ShareableInviteError,
} from "../lib/invite-link.js";
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

const emailItem = z.string().email();

async function tellOrganizer(
  teamId: string,
  joiner: { id: string; name: string | null; email: string },
  via: "link" | "invitation"
): Promise<void> {
  try {
    await notifyOrganizerOfJoin(teamId, joiner, via);
  } catch (err) {
    console.error("Could not tell the organizer about the join:", err);
  }
}

const inviteMembersSchema = z.object({
  emails: z.array(z.string()).min(1).max(50),
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

    const invalid = parsed.data.emails
      .map((value) => value.trim())
      .filter((value) => value && !emailItem.safeParse(value).success);
    const emails = [
      ...new Set(
        parsed.data.emails
          .map((value) => sanitizeTransform("email")(value))
          .filter((value) => emailItem.safeParse(value).success)
      ),
    ];
    if (emails.length === 0) {
      return error(
        "None of those look like email addresses.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound("Team not found");
    }
    if (team.archivedAt) {
      return error("This exchange is archived. New invitations are closed.", 409);
    }

    const results: Array<{
      email: string;
      status: string;
      error?: string;
      inviteUrl?: string;
    }> =
      invalid.map((email) => ({
        email,
        status: "invalid",
        error: "That is not an email address",
      }));

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
          invitationLinkToken: token,
          invitationStatus: "pending",
          role: "member",
        });

        await sendInvitationEmail(
          normalizedEmail,
          team.name,
          user.name || user.email,
          token,
          {
            exchangeDate: team.exchangeDate,
            wishlistDeadline: team.wishlistDeadline,
            budgetMin: team.budgetMin,
            budgetMax: team.budgetMax,
          }
        );

        results.push({
          email: normalizedEmail,
          status: "invited",
          inviteUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite/${token}`,
        });
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: unknown }).code)
            : "";
        if (code === "23505") {
          results.push({ email: normalizedEmail, status: "already_invited" });
          continue;
        }
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

    const shared = await resolveShareLink(token);
    if (shared.outcome !== "unknown") {
      return success({
        kind: "link",
        status: shared.outcome === "joinable" ? "open" : shared.outcome,
        exchangeName: shared.exchangeName,
        hostName: shared.hostName,
        exchangeDate: shared.exchangeDate,
        wishlistDeadline: shared.wishlistDeadline,
        budgetMin: shared.budgetMin,
        budgetMax: shared.budgetMax,
      });
    }

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
      kind: "email",
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

    const shared = await joinByShareLink(token, user);
    if (shared.ok) {
      if (!shared.alreadyMember) {
        await tellOrganizer(shared.team.id, user, "link");
      }
      return success({
        team: shared.team,
        message: shared.alreadyMember
          ? "Already a member"
          : "Invitation accepted",
      });
    }
    if (shared.outcome === "draw_locked") {
      return error(
        "Names have already been drawn for this exchange. Ask the organizer before joining — a late join is not added to the draw.",
        409,
        "DRAW_LOCKED"
      );
    }
    if (shared.outcome === "signing_off") {
      return error(
        "The organizer has turned off joining by link. Ask them to turn it back on, or for a personal invitation.",
        409,
        "SIGNING_OFF"
      );
    }
    if (shared.outcome === "archived") {
      return error("This exchange is archived. New people cannot join.", 409);
    }

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
      return forbidden(
        `This invitation was sent to ${invitation.invitedEmail}. You are signed in as ${user.email}. Sign out and open the link with that email.`
      );
    }

    if (invitation.team?.status === "assigned") {
      return error(
        "Names have already been drawn for this exchange. Ask the organizer before joining — a late join is not added to the draw.",
        409,
        "DRAW_LOCKED"
      );
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
        invitationLinkToken: null,
        joinedAt: new Date(),
      })
      .where(eq(teamMembers.id, invitation.id));

    await tellOrganizer(invitation.teamId, user, "invitation");
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
      .set({
        invitationStatus: "declined",
        invitationToken: null,
        invitationLinkToken: null,
      })
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
      return error(
        "You organize this exchange, so you cannot remove your own seat. Delete the exchange if the group is not going ahead.",
        400
      );
    }

    const draw = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });
    if (
      draw.length > 0 &&
      memberToRemove.invitationStatus === "accepted"
    ) {
      return error(
        "Names are already drawn. Removing someone would leave their giver without a recipient, and the draw cannot be changed. Ask them to sit this gift out instead.",
        409,
        "DRAW_LOCKED"
      );
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

async function _cancelInvitation(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const { teamId, memberId } = params;
    if (!teamId || !memberId) {
      return error("Team ID and Member ID required", 400);
    }

    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });
    if (!adminMembership) {
      return forbidden("Only the organizer can cancel an invitation");
    }

    const pending = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, memberId),
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "pending")
      ),
    });
    if (!pending) {
      return notFound("That invitation is no longer open");
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));
    return success({ message: "Invitation cancelled" });
  } catch (err) {
    console.error("Error cancelling invitation:", err);
    return serverError("Failed to cancel invitation");
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

    const invitations = pendingInvitations.filter((inv) => !inv.team.archivedAt).map((inv) => ({
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

    if (invitation.team?.status === "assigned") {
      return error(
        "Names have already been drawn for this exchange. Ask the organizer before joining — a late join is not added to the draw.",
        409,
        "DRAW_LOCKED"
      );
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
        invitationLinkToken: null,
        joinedAt: new Date(),
      })
      .where(eq(teamMembers.id, invitation.id));

    await tellOrganizer(invitation.teamId, user, "invitation");
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
      .set({
        invitationStatus: "declined",
        invitationToken: null,
        invitationLinkToken: null,
      })
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
    const previousToken = pendingMember.invitationToken;
    const previousLink = pendingMember.invitationLinkToken;

    await db
      .update(teamMembers)
      .set({
        invitationToken: tokenHash,
        invitationLinkToken: token,
        invitedAt: new Date(),
      })
      .where(eq(teamMembers.id, memberId));

    try {
      await sendInvitationEmail(
        pendingMember.invitedEmail,
        team.name,
        user.name || user.email,
        token,
        {
          exchangeDate: team.exchangeDate,
          wishlistDeadline: team.wishlistDeadline,
          budgetMin: team.budgetMin,
          budgetMax: team.budgetMax,
        }
      );
    } catch (emailErr) {
      // Keep the link the person may already have. A failed resend
      // must not replace a working invitation with one nobody received.
      await db
        .update(teamMembers)
        .set({
          invitationToken: previousToken,
          invitationLinkToken: previousLink,
          invitedAt: pendingMember.invitedAt,
        })
        .where(eq(teamMembers.id, memberId));
      console.error("Error resending invitation:", emailErr);
      return error(
        "The invitation email did not send. The previous link still works.",
        502,
        "EMAIL_FAILED"
      );
    }

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

export const cancelInvitation = wrapHandler(_cancelInvitation, {
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

async function organizerOf(teamId: string, userId: string) {
  return db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.invitationStatus, "accepted"),
      eq(teamMembers.role, "admin")
    ),
  });
}

function inviteUrl(token: string): string {
  const origin = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${origin}/invite/${token}`;
}

function shareableInviteError(err: unknown): Response | null {
  if (!(err instanceof ShareableInviteError)) return null;
  if (err.code === "LIVE_LINK") {
    return error(err.message, 409, "LIVE_LINK");
  }
  if (err.code === "DRAW_LOCKED") {
    return error(err.message, 409, "DRAW_LOCKED");
  }
  if (err.code === "NO_LIVE_LINK" || err.code === "UNKNOWN_LINK" || err.code === "ALREADY_EXPIRED") {
    return error(err.message, 409, err.code);
  }
  return null;
}

async function _createInviteLink(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);
    if (!(await organizerOf(teamId, user.id))) {
      return forbidden("Only the organizer can create an invite link");
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
    if (!team) return notFound("Team not found");
    if (team.archivedAt) {
      return error("This exchange is archived. New invitations are closed.", 409);
    }

    const issued = await generateShareLink(teamId);
    return success({
      id: issued.id,
      url: inviteUrl(issued.token),
      signingOn: true,
    });
  } catch (err) {
    const mapped = shareableInviteError(err);
    if (mapped) return mapped;
    console.error("Error creating invite link:", err);
    return serverError("Failed to create the invite link");
  }
}

async function _listInviteLinks(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);
    if (!(await organizerOf(teamId, user.id))) {
      return forbidden("Only the organizer can see invite links");
    }

    const links = await listShareLinks(teamId);
    const live = links.find((link) => !link.expiredAt) ?? null;
    return success({
      canGenerate: !live,
      signingOn: Boolean(live?.signingOn),
      links,
    });
  } catch (err) {
    console.error("Error listing invite links:", err);
    return serverError("Failed to list invite links");
  }
}

async function _setInviteLinkSigning(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);
    if (!(await organizerOf(teamId, user.id))) {
      return forbidden("Only the organizer can turn link signing on or off");
    }

    const body = JSON.parse((await req.text()) || "{}");
    if (typeof body.on !== "boolean") {
      return error("Say whether signing should be on.", 400, "VALIDATION_ERROR");
    }

    const link = await setShareSigning(teamId, body.on);
    return success({ id: link.id, signingOn: link.signingOn });
  } catch (err) {
    const mapped = shareableInviteError(err);
    if (mapped) return mapped;
    console.error("Error changing invite link signing:", err);
    return serverError("Failed to change invite link signing");
  }
}

async function _expireInviteLink(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const { teamId, linkId } = params;
    if (!teamId || !linkId) return error("Team ID and link ID required", 400);
    if (!(await organizerOf(teamId, user.id))) {
      return forbidden("Only the organizer can expire an invite link");
    }

    const expired = await expireShareLink(teamId, linkId);
    return success({ id: expired.id, expiredAt: expired.expiredAt });
  } catch (err) {
    const mapped = shareableInviteError(err);
    if (mapped) return mapped;
    console.error("Error expiring invite link:", err);
    return serverError("Failed to expire the invite link");
  }
}

export const createInviteLink = wrapHandler(_createInviteLink, {
  limiter: rateLimiters.inviteMembers,
  useUserId: true,
});

export const listInviteLinks = wrapHandler(_listInviteLinks, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const setInviteLinkSigning = wrapHandler(_setInviteLinkSigning, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const expireInviteLink = wrapHandler(_expireInviteLink, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});
