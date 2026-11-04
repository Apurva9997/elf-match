export type InviteShareFacts = {
  hostName: string;
  exchangeName: string;
  url: string;
  budgetMin?: string | null;
  budgetMax?: string | null;
  currency?: string | null;
  wishlistDeadline?: string | null;
  exchangeDate?: string | null;
};

function firstName(name: string): string {
  return name.split(" ")[0]?.trim() || "";
}

function day(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function amount(value: string, currency: string | null | undefined): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
    }).format(number);
  } catch {
    return `${code} ${number}`;
  }
}

function budgetLine(facts: InviteShareFacts): string | null {
  if (facts.budgetMin && facts.budgetMax) {
    return `Spend between ${amount(facts.budgetMin, facts.currency)} and ${amount(facts.budgetMax, facts.currency)}.`;
  }
  if (facts.budgetMax) return `Spend up to ${amount(facts.budgetMax, facts.currency)}.`;
  if (facts.budgetMin) return `Spend at least ${amount(facts.budgetMin, facts.currency)}.`;
  return null;
}

/**
 * What an organizer pastes into the group chat with the invite link.
 * The four lines are the same sequence as How an exchange runs, short
 * enough that someone reading the chat can follow them.
 */
export function inviteShareMessage(facts: InviteShareFacts): string {
  const host = firstName(facts.hostName);
  const lines = [
    host
      ? `${host} is inviting you to ${facts.exchangeName} on Elf Match.`
      : `You are invited to ${facts.exchangeName} on Elf Match.`,
    "",
    "It is a free Secret Santa. You sign in, join as yourself, and write a wishlist. After the names are drawn, only the person buying for you can read it.",
  ];

  const budget = budgetLine(facts);
  if (budget) lines.push(budget);
  if (facts.wishlistDeadline) {
    lines.push(`Wishlists are due ${day(facts.wishlistDeadline)}.`);
  }
  if (facts.exchangeDate) {
    lines.push(`Gifts change hands on ${day(facts.exchangeDate)}.`);
  }

  lines.push(
    "",
    "If you are organizing one of your own, it is four steps:",
    "1. Name the exchange, and set a budget and dates if you want them.",
    "2. Send one invite link, or invite people by email.",
    "3. Keep couples or close relatives from matching, if you need to.",
    "4. Preview the pairings, then send each person only their own name.",
    "",
    "Free. No card.",
    "",
    facts.url
  );
  return lines.join("\n");
}
