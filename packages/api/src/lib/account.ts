import { and, eq, inArray } from "drizzle-orm";
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

const forgottenName = "Former member";

/**
 * Removes this person from Elf Match. An exchange they organize is refused
 * until they archive it, so the group is not left without an organizer.
 * Their name, email, phone, address, and wishlist are removed. A saved draw
 * keeps the pair, with the name replaced, so the other person's gift is not lost.
 */
export async function accountDeletionBlock(userId: string): Promise<string | null> {
  const organized = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.userId, userId),
      eq(teamMembers.role, "admin"),
      eq(teamMembers.invitationStatus, "accepted")
    ),
    with: { team: { columns: { name: true, archivedAt: true } } },
  });
  const stillOpen = organized.filter((seat) => !seat.team.archivedAt);
  if (stillOpen.length === 0) return null;
  return `Archive ${stillOpen.map((seat) => seat.team.name).join(", ")} before deleting this account. The people in it still need an organizer.`;
}

export async function forgetAccount(userId: string): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  const blocked = await accountDeletionBlock(userId);
  if (blocked) return { ok: false, status: 409, message: blocked };

  const seats = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { id: true, teamId: true },
  });
  const seatIds = seats.map((seat) => seat.id);
  const drawnSeatIds = seatIds.length
    ? (
        await db
          .select({ id: assignments.giverId })
          .from(assignments)
          .where(inArray(assignments.giverId, seatIds))
      )
        .map((row) => row.id)
        .concat(
          (
            await db
              .select({ id: assignments.receiverId })
              .from(assignments)
              .where(inArray(assignments.receiverId, seatIds))
          ).map((row) => row.id)
        )
    : [];
  const drawn = new Set(drawnSeatIds);
  const undrawnSeatIds = seatIds.filter((id) => !drawn.has(id));

  await db.transaction(async (tx) => {
    if (seatIds.length > 0) {
      await tx.delete(exclusions).where(inArray(exclusions.member1Id, seatIds));
      await tx.delete(exclusions).where(inArray(exclusions.member2Id, seatIds));
    }
    // A saved draw points at the seat. Keep that seat, without the person.
    if (drawn.size > 0) {
      await tx
        .update(teamMembers)
        .set({
          userId: null,
          invitedEmail: forgottenName,
          invitationToken: null,
          invitationLinkToken: null,
        })
        .where(inArray(teamMembers.id, [...drawn]));
    }
    if (undrawnSeatIds.length > 0) {
      await tx.delete(teamMembers).where(inArray(teamMembers.id, undrawnSeatIds));
    }

    await tx
      .update(teams)
      .set({ createdBy: null, updatedAt: new Date() })
      .where(eq(teams.createdBy, userId));
    await tx.delete(activityLog).where(eq(activityLog.actorId, userId));
    await tx.delete(userAddresses).where(eq(userAddresses.userId, userId));
    await tx
      .update(users)
      .set({
        name: forgottenName,
        email: `forgotten-${userId}@forgotten.elfmatch`,
        mobile: null,
        avatarUrl: null,
        clerkId: null,
        preferences: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });

  return { ok: true };
}
