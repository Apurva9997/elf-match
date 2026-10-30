import { and, eq } from "drizzle-orm";
import { db, teamMembers, teams } from "../db/index.js";
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
            missingItems,
            team.id
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

export const sendReminders = wrapHandler(_sendReminders, {
  limiter: rateLimiters.reminders,
  useUserId: true,
});

