import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, teamMembers, teams, users } from "../db/index.js";
import { getUserFromRequest } from "../lib/auth.js";
import { sendReminderEmail } from "../lib/email.js";
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

async function _sendReminders(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    if (!(await isTeamAdmin(user.id, teamId))) {
      return forbidden("Only admins can send reminders");
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound("Team not found");
    }

    const members = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: {
        user: {
          with: {
            address: true,
          },
        },
        wishlist: {
          with: {
            items: true,
          },
        },
      },
    });

    const results: Array<{
      email: string;
      sent: boolean;
      missingItems: string[];
    }> = [];

    for (const member of members) {
      if (!member.user?.email) continue;

      const missingItems: string[] = [];

      if (!member.wishlist || member.wishlist.items.length === 0) {
        missingItems.push("Add items to your wishlist");
      }

      if (!member.user.address) {
        missingItems.push("Add your shipping address");
      }

      if (missingItems.length > 0) {
        try {
          const deadline = team.wishlistDeadline
            ? new Date(team.wishlistDeadline).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "soon";

          await sendReminderEmail(
            member.user.email,
            team.name,
            deadline,
            missingItems
          );

          results.push({
            email: member.user.email,
            sent: true,
            missingItems,
          });
        } catch (emailErr) {
          console.error(
            `Failed to send reminder to ${member.user.email}:`,
            emailErr
          );
          results.push({
            email: member.user.email,
            sent: false,
            missingItems,
          });
        }
      }
    }

    return success({
      message: `Sent ${results.filter((r) => r.sent).length} reminders`,
      results,
    });
  } catch (err) {
    console.error("Error sending reminders:", err);
    return serverError("Failed to send reminders");
  }
}

const changeUserEmailSchema = z.object({
  newEmail: z.string().email().transform(sanitizeTransform("email")),
});

async function _changeUserEmail(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const { teamId, userId } = params;
    if (!teamId || !userId) {
      return error("Team ID and User ID required", 400);
    }

    if (!(await isTeamAdmin(user.id, teamId))) {
      return forbidden("Only admins can change user emails");
    }

    const targetMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: {
        user: true,
      },
    });

    if (!targetMember || !targetMember.user) {
      return notFound("User not found in this team");
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = changeUserEmailSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid email address", 400, "VALIDATION_ERROR");
    }

    const { newEmail } = parsed.data;
    const normalizedNewEmail = newEmail.toLowerCase();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedNewEmail),
    });

    if (existingUser && existingUser.id !== userId) {
      return error("Email address already in use", 400);
    }

    await db
      .update(users)
      .set({
        email: normalizedNewEmail,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await db
      .update(teamMembers)
      .set({
        invitedEmail: normalizedNewEmail,
      })
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.invitationStatus, "pending")
        )
      );

    return success({
      message: "User email updated successfully",
      user: {
        id: targetMember.user.id,
        email: normalizedNewEmail,
        name: targetMember.user.name,
      },
    });
  } catch (err) {
    console.error("Error changing user email:", err);
    return serverError("Failed to change user email");
  }
}

export const sendReminders = wrapHandler(_sendReminders, {
  limiter: rateLimiters.reminders,
  useUserId: true,
});

export const changeUserEmail = wrapHandler(_changeUserEmail, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});
