import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { assignments, db, teamMembers, teams } from "../db/index.js";
import { hashToken } from "./encryption.js";

export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

type TeamRow = typeof teams.$inferSelect;

export type JoinByLinkResult =
  | { ok: true; team: TeamRow; alreadyMember: boolean }
  | { ok: false; status: number; message: string; code?: string };

async function findOpenLink(token: string) {
  return db.query.teams.findFirst({
    where: eq(teams.inviteLinkToken, hashToken(token)),
    with: { creator: { columns: { name: true } } },
  });
}

async function drawHasStarted(teamId: string): Promise<boolean> {
  const drawn = await db.query.assignments.findFirst({
    where: eq(assignments.teamId, teamId),
    columns: { id: true },
  });
  return Boolean(drawn);
}

/**
 * Turns an open shareable link into a joined seat for this user.
 * Someone already in the exchange is told so, and no second seat is added.
 * A pending email invitation for the same address is accepted in place,
 * so the People list does not show them twice.
 */
export async function joinByInviteLink(
  token: string,
  user: { id: string; email: string }
): Promise<JoinByLinkResult> {
  const team = await findOpenLink(token);
  if (!team || team.archivedAt) {
    return {
      ok: false,
      status: 404,
      message: "This invite link is not open. Ask the organizer for a new one.",
    };
  }

  if (team.status === "assigned" || (await drawHasStarted(team.id))) {
    return {
      ok: false,
      status: 409,
      code: "DRAW_LOCKED",
      message:
        "Names have already been drawn for this exchange. Ask the organizer before joining — a late join is not added to the draw.",
    };
  }

  const email = user.email.toLowerCase();
  const byUser = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, user.id)),
  });

  if (byUser?.invitationStatus === "accepted") {
    return { ok: true, team, alreadyMember: true };
  }

  const seat =
    byUser ||
    (await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.invitedEmail, email),
        eq(teamMembers.invitationStatus, "pending")
      ),
    }));

  if (seat) {
    await db
      .update(teamMembers)
      .set({
        userId: user.id,
        invitedEmail: seat.invitedEmail || email,
        invitationStatus: "accepted",
        invitationToken: null,
        invitationLinkToken: null,
        joinedAt: new Date(),
      })
      .where(eq(teamMembers.id, seat.id));
    return { ok: true, team, alreadyMember: false };
  }

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    invitedEmail: email,
    invitationStatus: "accepted",
    role: "member",
    joinedAt: new Date(),
  });

  return { ok: true, team, alreadyMember: false };
}

export async function inviteLinkPreview(token: string) {
  const team = await findOpenLink(token);
  if (!team || team.archivedAt) return null;

  const closed = team.status === "assigned" || (await drawHasStarted(team.id));
  return {
    kind: "link" as const,
    status: closed ? "closed" : "open",
    exchangeName: team.name,
    hostName: team.creator?.name?.split(" ")[0] || "The organizer",
    exchangeDate: team.exchangeDate,
    wishlistDeadline: team.wishlistDeadline,
    budgetMin: team.budgetMin,
    budgetMax: team.budgetMax,
  };
}
