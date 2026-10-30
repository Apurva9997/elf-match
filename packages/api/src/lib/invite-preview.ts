import { eq } from "drizzle-orm";
import { db, teamMembers } from "../db/index.js";
import { resolveShareLink } from "./invite-link.js";

export type InvitePreviewCopy = {
  title: string;
  description: string;
  hostName: string;
  exchangeName: string;
};

function firstName(name: string | null | undefined): string {
  const host = name?.split(" ")[0]?.trim();
  return host || "Someone";
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function copyFor(hostName: string, exchangeName: string): InvitePreviewCopy {
  const host = clip(hostName, 24);
  const exchange = clip(exchangeName, 40);
  return {
    hostName: host,
    exchangeName: exchange,
    title: `${host} is inviting you to ${exchange}`,
    description: `Join ${exchange} on Elf Match.`,
  };
}

const fallback: InvitePreviewCopy = {
  hostName: "Someone",
  exchangeName: "an exchange",
  title: "You are invited to an Elf Match exchange",
  description: "Open the link to join the gift exchange.",
};

export async function invitePreviewCopy(
  token: string
): Promise<InvitePreviewCopy> {
  if (!token) return fallback;
  try {
    // A shareable link is stored hashed. An emailed invitation also keeps
    // the raw token the message linked to, which is what a chat crawler has.
    const shared = await resolveShareLink(token);
    if (shared.outcome !== "unknown") {
      return copyFor(shared.hostName, shared.exchangeName);
    }

    const invitation = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.invitationLinkToken, token),
      with: {
        team: { with: { creator: { columns: { name: true } } } },
      },
    });
    if (invitation?.team) {
      return copyFor(
        firstName(invitation.team.creator?.name),
        invitation.team.name
      );
    }
  } catch (err) {
    console.error("Could not write the invitation preview:", err);
  }
  return fallback;
}
