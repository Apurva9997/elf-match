import { eq, inArray, or } from "drizzle-orm";
import {
  activityLog,
  assignments,
  db,
  exclusions,
  teamMembers,
  teams,
  userAddresses,
  users,
} from "../db/index.js";

type Deleter = Pick<typeof db, "delete">;

/** Removes one exchange and every row that belongs to it, including a saved draw. */
export async function eraseTeam(tx: Deleter, teamId: string): Promise<void> {
  await tx.delete(assignments).where(eq(assignments.teamId, teamId));
  await tx.delete(exclusions).where(eq(exclusions.teamId, teamId));
  await tx.delete(activityLog).where(eq(activityLog.teamId, teamId));
  await tx.delete(teams).where(eq(teams.id, teamId));
}

/**
 * Removes this person and every row that points at them.
 * An exchange they organize is removed with them, including a saved draw.
 * A seat in someone else's exchange is removed, and so is any pair or
 * exclusion that used that seat. Nothing is renamed or kept.
 */
export async function forgetAccount(userId: string): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  const seats = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { id: true, teamId: true, role: true },
  });
  const seatIds = seats.map((seat) => seat.id);
  const organizedTeamIds = seats
    .filter((seat) => seat.role === "admin")
    .map((seat) => seat.teamId);

  await db.transaction(async (tx) => {
    for (const teamId of organizedTeamIds) {
      await eraseTeam(tx, teamId);
    }

    const remainingSeatIds = seatIds.filter(
      (id) => !seats.some((seat) => seat.id === id && seat.role === "admin")
    );
    if (remainingSeatIds.length > 0) {
      await tx
        .delete(assignments)
        .where(
          or(
            inArray(assignments.giverId, remainingSeatIds),
            inArray(assignments.receiverId, remainingSeatIds)
          )
        );
      await tx
        .delete(exclusions)
        .where(
          or(
            inArray(exclusions.member1Id, remainingSeatIds),
            inArray(exclusions.member2Id, remainingSeatIds)
          )
        );
      await tx.delete(teamMembers).where(inArray(teamMembers.id, remainingSeatIds));
    }

    await tx.delete(activityLog).where(eq(activityLog.actorId, userId));
    await tx.delete(userAddresses).where(eq(userAddresses.userId, userId));
    // A team this person created, but no longer organizes, stays for its members.
    await tx
      .update(teams)
      .set({ createdBy: null, updatedAt: new Date() })
      .where(eq(teams.createdBy, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });

  return { ok: true };
}
