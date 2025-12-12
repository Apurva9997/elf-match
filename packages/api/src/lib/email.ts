import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION || "ap-south-1" });
const FROM_EMAIL = process.env.SES_FROM_EMAIL || "noreply@secretsanta.app";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: EmailOptions): Promise<void> {
  // In development, just log the email
  if (process.env.STAGE === "dev" || process.env.NODE_ENV === "development") {
    console.log("📧 Email (dev mode):");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text || html}`);
    return;
  }

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
        ...(text && { Text: { Data: text } }),
      },
    },
  });

  await ses.send(command);
}

export async function sendMagicLinkEmail(
  email: string,
  token: string
): Promise<void> {
  const magicLink = `${FRONTEND_URL}/auth/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in to Secret Santa</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0F1419; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <span style="font-size: 48px;">🎄</span>
                  <h1 style="color: #FFF8E7; font-size: 28px; margin: 16px 0 0 0; font-weight: 600;">
                    Secret Santa
                  </h1>
                </td>
              </tr>
              
              <!-- Card -->
              <tr>
                <td style="background: linear-gradient(135deg, #1A2332 0%, #232D3F 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(212, 168, 83, 0.2);">
                  <h2 style="color: #FFF8E7; font-size: 24px; margin: 0 0 16px 0; font-weight: 500;">
                    Sign in to your account
                  </h2>
                  <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    Click the button below to securely sign in. This link will expire in 15 minutes.
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center">
                        <a href="${magicLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #D4A853 0%, #B87333 100%); color: #0F1419; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 8px;">
                          ✨ Sign In
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                    If you didn't request this email, you can safely ignore it.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 32px;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Secret Santa. Made with ❤️
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Sign in to Secret Santa

Click this link to sign in: ${magicLink}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.
  `.trim();

  await sendEmail({
    to: email,
    subject: "🎄 Sign in to Secret Santa",
    html,
    text,
  });
}

export async function sendInvitationEmail(
  email: string,
  teamName: string,
  inviterName: string,
  token: string
): Promise<void> {
  const inviteLink = `${FRONTEND_URL}/invite/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're invited to Secret Santa!</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0F1419; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <span style="font-size: 48px;">🎁</span>
                  <h1 style="color: #FFF8E7; font-size: 28px; margin: 16px 0 0 0; font-weight: 600;">
                    You're Invited!
                  </h1>
                </td>
              </tr>
              
              <!-- Card -->
              <tr>
                <td style="background: linear-gradient(135deg, #1A2332 0%, #232D3F 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(212, 168, 83, 0.2);">
                  <h2 style="color: #FFF8E7; font-size: 24px; margin: 0 0 16px 0; font-weight: 500;">
                    Join "${teamName}"
                  </h2>
                  <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    <strong style="color: #D4A853;">${inviterName}</strong> has invited you to join their Secret Santa gift exchange! Click below to accept and start adding items to your wishlist.
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center">
                        <a href="${inviteLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #D4A853 0%, #B87333 100%); color: #0F1419; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 8px;">
                          🎄 Accept Invitation
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                    If you don't want to participate, you can simply ignore this email.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 32px;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Secret Santa. Made with ❤️
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
You're invited to join "${teamName}" Secret Santa!

${inviterName} has invited you to join their Secret Santa gift exchange.

Click this link to accept: ${inviteLink}

If you don't want to participate, you can simply ignore this email.
  `.trim();

  await sendEmail({
    to: email,
    subject: `🎁 ${inviterName} invited you to Secret Santa!`,
    html,
    text,
  });
}

export async function sendAssignmentEmail(
  email: string,
  teamName: string,
  gifteeName: string
): Promise<void> {
  const dashboardLink = `${FRONTEND_URL}/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Secret Santa has been assigned!</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0F1419; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <span style="font-size: 48px;">🎅</span>
                  <h1 style="color: #FFF8E7; font-size: 28px; margin: 16px 0 0 0; font-weight: 600;">
                    Ho Ho Ho!
                  </h1>
                </td>
              </tr>
              
              <!-- Card -->
              <tr>
                <td style="background: linear-gradient(135deg, #1A2332 0%, #232D3F 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(212, 168, 83, 0.2);">
                  <h2 style="color: #FFF8E7; font-size: 24px; margin: 0 0 16px 0; font-weight: 500;">
                    Your Secret Santa Match is Ready!
                  </h2>
                  <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                    The assignments for <strong style="color: #D4A853;">"${teamName}"</strong> are in!
                  </p>
                  <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    You'll be getting a gift for: <strong style="color: #4ADE80; font-size: 20px;">${gifteeName}</strong>
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center">
                        <a href="${dashboardLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #D4A853 0%, #B87333 100%); color: #0F1419; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 8px;">
                          🎁 View Their Wishlist
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                    Remember, keep it a secret! 🤫
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 32px;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Secret Santa. Made with ❤️
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Your Secret Santa Match is Ready!

The assignments for "${teamName}" are in!

You'll be getting a gift for: ${gifteeName}

Visit ${dashboardLink} to view their wishlist.

Remember, keep it a secret! 🤫
  `.trim();

  await sendEmail({
    to: email,
    subject: `🎅 Your Secret Santa match for "${teamName}" is ready!`,
    html,
    text,
  });
}

export async function sendReminderEmail(
  email: string,
  teamName: string,
  deadline: string,
  missingItems: string[]
): Promise<void> {
  const dashboardLink = `${FRONTEND_URL}/dashboard`;

  const missingItemsList = missingItems.map((item) => `• ${item}`).join("\n");
  const missingItemsHtml = missingItems
    .map((item) => `<li style="margin-bottom: 8px;">${item}</li>`)
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reminder: Complete your Secret Santa profile</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0F1419; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <span style="font-size: 48px;">⏰</span>
                  <h1 style="color: #FFF8E7; font-size: 28px; margin: 16px 0 0 0; font-weight: 600;">
                    Friendly Reminder
                  </h1>
                </td>
              </tr>
              
              <!-- Card -->
              <tr>
                <td style="background: linear-gradient(135deg, #1A2332 0%, #232D3F 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(212, 168, 83, 0.2);">
                  <h2 style="color: #FFF8E7; font-size: 24px; margin: 0 0 16px 0; font-weight: 500;">
                    Don't forget to complete your profile!
                  </h2>
                  <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                    The deadline for <strong style="color: #D4A853;">"${teamName}"</strong> is <strong style="color: #FBBF24;">${deadline}</strong>.
                  </p>
                  <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                    You still need to:
                  </p>
                  <ul style="color: #F87171; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; padding-left: 20px;">
                    ${missingItemsHtml}
                  </ul>
                  
                  <!-- Button -->
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center">
                        <a href="${dashboardLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #D4A853 0%, #B87333 100%); color: #0F1419; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 8px;">
                          ✏️ Complete Now
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 32px;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Secret Santa. Made with ❤️
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Friendly Reminder: Complete your Secret Santa profile!

The deadline for "${teamName}" is ${deadline}.

You still need to:
${missingItemsList}

Visit ${dashboardLink} to complete your profile.
  `.trim();

  await sendEmail({
    to: email,
    subject: `⏰ Reminder: Complete your "${teamName}" Secret Santa profile`,
    html,
    text,
  });
}
