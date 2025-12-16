import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, magicLinks, users } from "../db/index.js";
import {
  generateMagicLinkToken,
  generateTokens,
  getUserFromEvent,
  verifyToken,
} from "../lib/auth.js";
import { sendMagicLinkEmail } from "../lib/email.js";
import { hashToken } from "../lib/encryption.js";
import { error, serverError, success, unauthorized } from "../lib/response.js";

const sendMagicLinkSchema = z.object({
  email: z.string().email(),
});

const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
  name: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function sendMagicLink(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const parsed = sendMagicLinkSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid email address", 400, "VALIDATION_ERROR");
    }

    const { email } = parsed.data;
    const token = generateMagicLinkToken();
    const tokenHash = hashToken(token); // Store hash, not the actual token
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the magic link with hashed token
    await db.insert(magicLinks).values({
      email: email.toLowerCase(),
      token: tokenHash,
      expiresAt,
    });

    // Send the actual token to the user via email
    await sendMagicLinkEmail(email.toLowerCase(), token);

    return success({ message: "Magic link sent" });
  } catch (err) {
    console.error("Error sending magic link:", err);
    return serverError("Failed to send magic link");
  }
}

export async function verifyMagicLink(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const parsed = verifyMagicLinkSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid token", 400, "VALIDATION_ERROR");
    }

    const { token, name } = parsed.data;

    // Hash the provided token to compare with stored hash
    const tokenHash = hashToken(token);

    // Find and validate the magic link using the hash
    const magicLink = await db.query.magicLinks.findFirst({
      where: and(
        eq(magicLinks.token, tokenHash),
        gt(magicLinks.expiresAt, new Date()),
        isNull(magicLinks.usedAt)
      ),
    });

    if (!magicLink) {
      return error("Invalid or expired token", 400, "INVALID_TOKEN");
    }

    // Mark the magic link as used
    await db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, magicLink.id));

    // Find or create the user
    let user = await db.query.users.findFirst({
      where: eq(users.email, magicLink.email),
    });

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: magicLink.email,
          name: name || magicLink.email.split("@")[0],
        })
        .returning();
      user = newUser;
    } else if (name && !user.name) {
      // Update name if provided and user doesn't have one
      const [updatedUser] = await db
        .update(users)
        .set({ name, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      user = updatedUser;
    }

    // Generate tokens
    const tokens = await generateTokens(user.id, user.email);

    return success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    });
  } catch (err) {
    console.error("Error verifying magic link:", err);
    return serverError("Failed to verify magic link");
  }
}

export async function refreshToken(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const parsed = refreshTokenSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid refresh token", 400, "VALIDATION_ERROR");
    }

    const { refreshToken: token } = parsed.data;
    const payload = await verifyToken(token);

    if (!payload || payload.type !== "refresh") {
      return unauthorized("Invalid refresh token");
    }

    // Verify user still exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return unauthorized("User not found");
    }

    // Generate new tokens
    const tokens = await generateTokens(user.id, user.email);

    return success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    });
  } catch (err) {
    console.error("Error refreshing token:", err);
    return serverError("Failed to refresh token");
  }
}

export async function getMe(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);

    if (!user) {
      return unauthorized();
    }

    return success({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    console.error("Error getting user:", err);
    return serverError("Failed to get user");
  }
}
