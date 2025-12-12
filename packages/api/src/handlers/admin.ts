import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and } from 'drizzle-orm';
import { db, teams, teamMembers, wishlists, addresses } from '../db/index.js';
import { getUserFromEvent } from '../lib/auth.js';
import { sendReminderEmail } from '../lib/email.js';
import { success, error, unauthorized, forbidden, notFound, serverError } from '../lib/response.js';

async function isTeamAdmin(userId: string, teamId: string) {
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.invitationStatus, 'accepted'),
      eq(teamMembers.role, 'admin')
    ),
  });
  return !!membership;
}

export async function sendReminders(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error('Team ID required', 400);

    if (!(await isTeamAdmin(user.id, teamId))) {
      return forbidden('Only admins can send reminders');
    }

    // Get team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound('Team not found');
    }

    // Get all accepted members with their wishlists and addresses
    const members = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, 'accepted')
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

    const results: Array<{
      email: string;
      sent: boolean;
      missingItems: string[];
    }> = [];

    for (const member of members) {
      if (!member.user?.email) continue;

      const missingItems: string[] = [];

      // Check wishlist
      if (!member.wishlist || member.wishlist.items.length === 0) {
        missingItems.push('Add items to your wishlist');
      }

      // Check address
      if (!member.address) {
        missingItems.push('Add your shipping address');
      }

      // Only send reminder if something is missing
      if (missingItems.length > 0) {
        try {
          const deadline = team.wishlistDeadline
            ? new Date(team.wishlistDeadline).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'soon';

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
          console.error(`Failed to send reminder to ${member.user.email}:`, emailErr);
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
    console.error('Error sending reminders:', err);
    return serverError('Failed to send reminders');
  }
}

