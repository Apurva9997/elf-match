import { randomBytes } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  assignments,
  db,
  shareableInviteLinks,
  teamMembers,
  teams,
} from "../db/index.js";
import { hashToken } from "./encryption.js";

export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export class ShareableInviteError extends Error {
  code: "LIVE_LINK" | "NO_LIVE_LINK" | "UNKNOWN_LINK" | "ALREADY_EXPIRED" | "DRAW_LOCKED";

  constructor(
    code: ShareableInviteError["code"],
    message: string
  ) {
    super(message);
    this.name = "ShareableInviteError";
    this.code = code;
  }
}

export type ShareableLinkView = {
  id: string;
  createdAt: Date;
  expiredAt: Date | null;
  signingOn: boolean;
  /** Present only while the link is live and the token was stored. */
  token: string | null;
};

export type IssuedLink = {
  id: string;
  token: string;
};

export type ResolveResult =
  | {
      outcome: "joinable" | "signing_off" | "draw_locked";
      exchangeId: string;
      exchangeName: string;
      hostName: string;
      exchangeDate: string | null;
      wishlistDeadline: string | null;
      budgetMin: string | null;
      budgetMax: string | null;
    }
  | { outcome: "unknown" };

export type JoinResult =
  | { ok: true; team: typeof teams.$inferSelect; alreadyMember: boolean }
  | { ok: false; outcome: "unknown" | "signing_off" | "draw_locked" | "archived" };

type LinkRow = typeof shareableInviteLinks.$inferSelect;

function hostFirstName(name: string | null | undefined): string {
  return name?.split(" ")[0]?.trim() || "The organizer";
}

async function drawHasStarted(teamId: string): Promise<boolean> {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { status: true },
  });
  if (team?.status === "assigned") return true;
  const drawn = await db.query.assignments.findFirst({
    where: eq(assignments.teamId, teamId),
    columns: { id: true },
  });
  return Boolean(drawn);
}

async function liveLink(teamId: string): Promise<LinkRow | undefined> {
  return db.query.shareableInviteLinks.findFirst({
    where: and(
      eq(shareableInviteLinks.teamId, teamId),
      isNull(shareableInviteLinks.expiredAt)
    ),
  });
}

/**
 * Mints one address and turns signing on. Refuses while an unexpired link
 * exists, including one whose signing is off. The raw token is stored so
 * the organizer can copy it again. Acceptance still checks the hash.
 */
export async function generateShareLink(teamId: string): Promise<IssuedLink> {
  if (await drawHasStarted(teamId)) {
    throw new ShareableInviteError(
      "DRAW_LOCKED",
      "Names have already been drawn, so a new invite link would not add anyone to the draw."
    );
  }

  const existing = await liveLink(teamId);
  if (existing) {
    throw new ShareableInviteError(
      "LIVE_LINK",
      "A live invite link already exists. Expire it before generating another."
    );
  }

  const token = newInviteToken();
  try {
    const [row] = await db
      .insert(shareableInviteLinks)
      .values({
        teamId,
        token,
        tokenHash: hashToken(token),
        signingOn: true,
      })
      .returning({ id: shareableInviteLinks.id });
    if (!row) {
      throw new Error("Invite link was not stored");
    }
    return { id: row.id, token };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    if (code === "23505") {
      throw new ShareableInviteError(
        "LIVE_LINK",
        "A live invite link already exists. Expire it before generating another."
      );
    }
    throw err;
  }
}

/** Newest first. A live row includes the token the organizer can copy. */
export async function listShareLinks(teamId: string): Promise<ShareableLinkView[]> {
  const rows = await db.query.shareableInviteLinks.findMany({
    where: eq(shareableInviteLinks.teamId, teamId),
    orderBy: [desc(shareableInviteLinks.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    expiredAt: row.expiredAt,
    signingOn: row.expiredAt ? false : row.signingOn,
    token: row.expiredAt ? null : row.token,
  }));
}

/**
 * Turns joining through the live address on or off. Does not change the
 * address, and does not expire it.
 */
export async function setShareSigning(teamId: string, on: boolean): Promise<ShareableLinkView> {
  const live = await liveLink(teamId);
  if (!live) {
    throw new ShareableInviteError(
      "NO_LIVE_LINK",
      "There is no live link to change. Generate one, or the last one has been expired."
    );
  }
  if (on && (await drawHasStarted(teamId))) {
    throw new ShareableInviteError(
      "DRAW_LOCKED",
      "Names have already been drawn, so turning the link on would not add anyone to the draw."
    );
  }
  if (live.signingOn !== on) {
    await db
      .update(shareableInviteLinks)
      .set({ signingOn: on })
      .where(eq(shareableInviteLinks.id, live.id));
  }
  return {
    id: live.id,
    createdAt: live.createdAt,
    expiredAt: null,
    signingOn: on,
    token: live.token,
  };
}

/** Retires that address. After this, generate is allowed again. */
export async function expireShareLink(
  teamId: string,
  linkId: string
): Promise<ShareableLinkView> {
  const row = await db.query.shareableInviteLinks.findFirst({
    where: and(
      eq(shareableInviteLinks.id, linkId),
      eq(shareableInviteLinks.teamId, teamId)
    ),
  });
  if (!row) {
    throw new ShareableInviteError("UNKNOWN_LINK", "That link is not on this exchange.");
  }
  if (row.expiredAt) {
    throw new ShareableInviteError("ALREADY_EXPIRED", "That link is already expired.");
  }
  const expiredAt = new Date();
  await db
    .update(shareableInviteLinks)
    .set({ expiredAt, signingOn: false, token: null })
    .where(eq(shareableInviteLinks.id, row.id));
  return {
    id: row.id,
    createdAt: row.createdAt,
    expiredAt,
    signingOn: false,
    token: null,
  };
}

async function findByToken(token: string) {
  return db.query.shareableInviteLinks.findFirst({
    where: eq(shareableInviteLinks.tokenHash, hashToken(token)),
    with: {
      team: { with: { creator: { columns: { name: true } } } },
    },
  });
}

function presented(
  link: NonNullable<Awaited<ReturnType<typeof findByToken>>>,
  outcome: "joinable" | "signing_off" | "draw_locked"
): ResolveResult {
  const team = link.team;
  return {
    outcome,
    exchangeId: team.id,
    exchangeName: team.name,
    hostName: hostFirstName(team.creator?.name),
    exchangeDate: team.exchangeDate,
    wishlistDeadline: team.wishlistDeadline,
    budgetMin: team.budgetMin,
    budgetMax: team.budgetMax,
  };
}

/**
 * What a presented token is allowed to do. Unknown, expired, and archived
 * are the same result, so a guesser cannot tell a retired address from a
 * made-up one. Signing off and a finished draw stay distinct, because the
 * address still exists and the page can say why joining is closed.
 */
export async function resolveShareLink(token: string): Promise<ResolveResult> {
  const link = await findByToken(token);
  if (!link?.team || link.expiredAt || link.team.archivedAt) {
    return { outcome: "unknown" };
  }
  if (link.team.status === "assigned" || (await drawHasStarted(link.team.id))) {
    return presented(link, "draw_locked");
  }
  if (!link.signingOn) {
    return presented(link, "signing_off");
  }
  return presented(link, "joinable");
}

/**
 * Turns an open shareable link into a joined seat. The address is not
 * consumed. Someone already in the exchange is told so. A pending email
 * invitation for the same address is accepted in place, so the People list
 * does not show them twice.
 */
export async function joinByShareLink(
  token: string,
  user: { id: string; email: string }
): Promise<JoinResult> {
  const link = await findByToken(token);
  if (!link?.team || link.expiredAt) {
    return { ok: false, outcome: "unknown" };
  }
  if (link.team.archivedAt) {
    return { ok: false, outcome: "archived" };
  }
  if (link.team.status === "assigned" || (await drawHasStarted(link.team.id))) {
    return { ok: false, outcome: "draw_locked" };
  }
  if (!link.signingOn) {
    return { ok: false, outcome: "signing_off" };
  }

  const team = link.team;
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
