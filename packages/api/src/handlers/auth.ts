import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, magicLinks, users } from "../db/index.js";
import {
  generateMagicLinkToken,
  generateTokens,
  getUserFromRequest,
  verifyToken,
} from "../lib/auth.js";
import { sendMagicLinkEmail } from "../lib/email.js";
import { hashToken } from "../lib/encryption.js";
import { type RouteParams, wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import { error, serverError, success, unauthorized } from "../lib/response.js";
import { sanitizeTransform } from "../lib/sanitize.js";

const sendMagicLinkSchema = z.object({
  email: z.string().email().transform(sanitizeTransform("email")),
});

const verifyMagicLinkSchema = z.object({
  token: z.string().min(1).transform(sanitizeTransform("text")),
  name: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeTransform("text")(val) : val)),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).transform(sanitizeTransform("text")),
});

async function _sendMagicLink(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const body = JSON.parse(await req.text() || "{}");
    const parsed = sendMagicLinkSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid email address", 400, "VALIDATION_ERROR");
    }

    const { email } = parsed.data;
    const token = generateMagicLinkToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.insert(magicLinks).values({
      email: email.toLowerCase(),
      token: tokenHash,
      expiresAt,
    });

    await sendMagicLinkEmail(email.toLowerCase(), token);

    return success({ message: "Magic link sent" });
  } catch (err) {
    console.error("Error sending magic link:", err);
    return serverError("Failed to send magic link");
  }
}

async function _verifyMagicLink(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const body = JSON.parse(await req.text() || "{}");
    const parsed = verifyMagicLinkSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid token", 400, "VALIDATION_ERROR");
    }

    const { token, name } = parsed.data;
    const tokenHash = hashToken(token);

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

    await db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, magicLink.id));

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
    } else {
      if (name && !user.name) {
        const [updatedUser] = await db
          .update(users)
          .set({ name, updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .returning();
        user = updatedUser;
      }
    }

    const tokens = await generateTokens(user.id, user.email);

    return success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences || {},
      },
      ...tokens,
    });
  } catch (err) {
    console.error("Error verifying magic link:", err);
    return serverError("Failed to verify magic link");
  }
}

async function _refreshToken(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const body = JSON.parse(await req.text() || "{}");
    const parsed = refreshTokenSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid refresh token", 400, "VALIDATION_ERROR");
    }

    const { refreshToken: token } = parsed.data;
    const payload = await verifyToken(token);

    if (!payload || payload.type !== "refresh") {
      return unauthorized("Invalid refresh token");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return unauthorized("User not found");
    }

    const tokens = await generateTokens(user.id, user.email);

    return success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences || {},
      },
      ...tokens,
    });
  } catch (err) {
    console.error("Error refreshing token:", err);
    return serverError("Failed to refresh token");
  }
}

async function _getMe(req: Request, _params: RouteParams): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return unauthorized();
    }

    return success({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences || {},
    });
  } catch (err) {
    console.error("Error getting user:", err);
    return serverError("Failed to get user");
  }
}

export const sendMagicLink = wrapHandler(_sendMagicLink, {
  limiter: rateLimiters.auth,
  useUserId: false,
});

export const verifyMagicLink = wrapHandler(_verifyMagicLink, {
  limiter: rateLimiters.authVerify,
  useUserId: false,
});

export const refreshToken = wrapHandler(_refreshToken, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const getMe = wrapHandler(_getMe, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});
