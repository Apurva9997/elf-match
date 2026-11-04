import Mailgun from "mailgun.js";
import FormData from "form-data";
import { budgetRange } from "./money.js";

function fromAddress() {
  const raw = process.env.FROM_EMAIL || "noreply@localhost";
  if (raw.includes("<")) return raw;
  return `ElfMatch <${raw}>`;
}
const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:3000";

let mailgunClient: ReturnType<Mailgun["client"]> | undefined;

function getMailgun() {
  if (!mailgunClient) {
    const key = process.env.MAILGUN_API_KEY;
    if (!key) {
      throw new Error("MAILGUN_API_KEY is not configured");
    }
    mailgunClient = new Mailgun(FormData).client({
      username: "api",
      key,
    });
  }
  return mailgunClient;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ExchangeFacts {
  exchangeDate?: string | null;
  wishlistDeadline?: string | null;
  budgetMin?: string | null;
  budgetMax?: string | null;
  currency?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMailDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function budgetLine(facts: ExchangeFacts): string | null {
  return budgetRange(facts.budgetMin, facts.budgetMax, facts.currency);
}

function paperEmail(heading: string, bodyHtml: string, text: string) {
  const year = new Date().getFullYear();
  const safeHeading = escapeHtml(heading);
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeHeading}</title>
</head>
<body style="margin:0;padding:0;background:#F6F1E7;">
  <div style="display:none;max-height:0;overflow:hidden;">${safeHeading}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1E7;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#FFFCF6;border:1px solid #DDD4C4;border-collapse:collapse;">
          <tr>
            <td style="padding:28px 32px 0 32px;font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:12px;letter-spacing:2px;color:#8E3A42;">ELF MATCH</td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0 32px;font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:32px;line-height:1.2;color:#1E3A32;">${safeHeading}</td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px 32px;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;font-size:16px;line-height:1.55;color:#5C564C;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;border-top:1px solid #DDD4C4;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;font-size:12px;line-height:1.5;color:#6F675C;">
              <div style="padding-top:16px;">&copy; ${year} Elf Match. Assignments stay with the person who is giving.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { html, text };
}

function factRows(facts: ExchangeFacts): { html: string; text: string } {
  const rows: Array<[string, string]> = [];
  const budget = budgetLine(facts);
  const wishlists = formatMailDate(facts.wishlistDeadline);
  const exchange = formatMailDate(facts.exchangeDate);
  if (budget) rows.push(["Budget", budget]);
  if (wishlists) rows.push(["Wishlists due", wishlists]);
  if (exchange) rows.push(["Exchange", exchange]);
  if (rows.length === 0) return { html: "", text: "" };
  const html = `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px 0;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#6F675C;font-size:13px;">${label}</td><td style="padding:6px 0;text-align:right;color:#1C1915;">${escapeHtml(value)}</td></tr>`
    )
    .join("")}</table>`;
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  return { html, text };
}

function paperButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4px 0 0 0;"><tr><td style="background:#8E3A42;">
    <a href="${href}" style="display:inline-block;background:#8E3A42;color:#F6F1E7;text-decoration:none;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;font-size:16px;font-weight:600;padding:12px 20px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: EmailOptions): Promise<void> {
  if (process.env.NETLIFY_DEV === "true" || process.env.NODE_ENV === "development") {
    console.log("📧 Email (dev mode):");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text || html}`);
    return;
  }

  await getMailgun().messages.create(process.env.MAILGUN_DOMAIN || "", {
    from: fromAddress(),
    to,
    subject,
    html,
    ...(text && { text }),
  });
}

export async function sendInvitationEmail(
  email: string,
  teamName: string,
  inviterName: string,
  token: string,
  facts: ExchangeFacts = {}
): Promise<void> {
  const inviteLink = `${FRONTEND_URL()}/invite/${token}`;
  const host = inviterName.split(" ")[0] || "The organizer";
  const name = teamName;
  const factsBlock = factRows(facts);

  const { html, text } = paperEmail(
    `${host} invited you to ${name}.`,
    `<p style="margin:0 0 16px 0;">This is a Secret Santa exchange. You will write a wishlist. After the names are drawn, only the person buying for you can read it. Your delivery address, if you add one, is shown only to that person.</p>
     ${factsBlock.html}
     <p style="margin:0 0 20px 0;">Sign in with this email address. A different email will not see the seat.</p>
     ${paperButton(inviteLink, "Open the invitation")}`,
    [
      `${inviterName.split(" ")[0] || "The organizer"} invited you to ${teamName}.`,
      "",
      "This is a Secret Santa exchange. You will write a wishlist. After the names are drawn, only the person buying for you can read it.",
      factsBlock.text,
      "",
      "Sign in with this email address. A different email will not see the seat.",
      "",
      `Open the invitation: ${inviteLink}`,
    ]
      .filter((line) => line !== undefined)
      .join("\n")
      .trim()
  );

  await sendEmail({
    to: email,
    subject: `${inviterName.split(" ")[0] || "Someone"} invited you to ${teamName}`,
    html,
    text,
  });
}

export async function sendAssignmentEmail(
  email: string,
  teamName: string,
  gifteeName: string,
  teamId: string
): Promise<void> {
  const dashboardLink = `${FRONTEND_URL()}/dashboard/teams/${teamId}?tab=assignment`;

  const { html, text } = paperEmail(
    `You are buying for ${gifteeName}.`,
    `<p style="margin:0 0 16px 0;">The names for ${escapeHtml(teamName)} have been sent. This email names only your recipient. Sign in to see their wishlist and, if they saved one, their delivery address.</p>
     ${paperButton(dashboardLink, "Open your assignment")}`,
    [
      `You are buying for ${gifteeName}.`,
      "",
      `The names for ${teamName} have been sent. This email names only your recipient.`,
      "Sign in to see their wishlist and, if they saved one, their delivery address.",
      "",
      `Open your assignment: ${dashboardLink}`,
    ].join("\n")
  );

  await sendEmail({
    to: email,
    subject: `You are buying for ${gifteeName} — ${teamName}`,
    html,
    text,
  });
}

export async function sendMemberJoinedEmail(
  organizerEmail: string,
  organizerName: string,
  joinerName: string,
  joinerEmail: string,
  teamName: string,
  teamId: string,
  joinedCount: number,
  via: "link" | "invitation"
): Promise<void> {
  const exchangeLink = `${FRONTEND_URL()}/dashboard/teams/${teamId}`;
  const host = organizerName.split(" ")[0] || "there";
  const who = joinerName.trim() || joinerEmail;
  const how =
    via === "link"
      ? "They opened the shared invite link."
      : "They accepted the invitation sent to their email.";
  const ready =
    joinedCount >= 3
      ? `${joinedCount} people have joined, which is enough to draw.`
      : `${joinedCount} ${joinedCount === 1 ? "person has" : "people have"} joined. A draw needs three.`;

  const { html, text } = paperEmail(
    `${who} joined ${teamName}.`,
    `<p style="margin:0 0 16px 0;">${escapeHtml(host)}, ${escapeHtml(who)} (${escapeHtml(joinerEmail)}) is now in the exchange. ${how}</p>
     <p style="margin:0 0 20px 0;">${escapeHtml(ready)}</p>
     ${paperButton(exchangeLink, "Open the exchange")}`,
    [
      `${who} joined ${teamName}.`,
      "",
      `${host}, ${who} (${joinerEmail}) is now in the exchange. ${how}`,
      ready,
      "",
      `Open the exchange: ${exchangeLink}`,
    ].join("\n")
  );

  await sendEmail({
    to: organizerEmail,
    subject: `${who} joined ${teamName}`,
    html,
    text,
  });
}

export async function sendReminderEmail(
  email: string,
  teamName: string,
  deadline: string,
  missingItems: string[],
  teamId?: string
): Promise<void> {
  const dashboardLink = teamId
    ? `${FRONTEND_URL()}/dashboard/teams/${teamId}`
    : `${FRONTEND_URL()}/dashboard`;

  const missingItemsList = missingItems.map((item) => `• ${item}`).join("\n");
  const missingItemsHtml = missingItems
    .map((item) => `<li style="margin-bottom:8px;">${escapeHtml(item)}</li>`)
    .join("");
  const { html, text } = paperEmail(
    `${teamName} still needs a detail from you.`,
    `<p style="margin:0 0 16px 0;">Wishlists are due ${escapeHtml(deadline)}. You still need to:</p>
     <ul style="margin:0 0 20px 0;padding-left:20px;color:#1C1915;">${missingItemsHtml}</ul>
     ${paperButton(dashboardLink, "Open the exchange")}`,
    [
      `${teamName} still needs a detail from you.`,
      "",
      `Wishlists are due ${deadline}. You still need to:`,
      missingItemsList,
      "",
      `Open the exchange: ${dashboardLink}`,
    ].join("\n")
  );

  await sendEmail({
    to: email,
    subject: `${teamName} still needs a detail from you`,
    html,
    text,
  });
}
