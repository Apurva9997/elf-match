import { and, count, eq } from "drizzle-orm";
import { db, teamMembers, teams, users } from "../db/index.js";
import { sendMemberJoinedEmail } from "./email.js";

/**
 * Tells the organizer that someone took a seat. A person who was already
 * in the exchange is not news. The mail is the organizer's to read, so a
 * failure here does not undo the join.
 */
export async function notifyOrganizerOfJoin(
  teamId: string,
  joiner: { id: string; name: string | null; email: string },
  via: "link" | "invitation"
): Promise<void> {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { id: true, name: true, createdBy: true },
  });
  if (!team?.createdBy || team.createdBy === joiner.id) return;

  const organizer = await db.query.users.findFirst({
    where: eq(users.id, team.createdBy),
    columns: { email: true, name: true },
  });
  if (!organizer?.email) return;

  const [joined] = await db
    .select({ n: count() })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      )
    );

  await sendMemberJoinedEmail(
    organizer.email,
    organizer.name || "there",
    joiner.name || joiner.email,
    joiner.email,
    team.name,
    team.id,
    joined?.n ?? 1,
    via
  );
}
