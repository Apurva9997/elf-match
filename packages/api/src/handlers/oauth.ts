import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "../db/index.js";
import { generateTokens } from "../lib/auth.js";
import { type RouteParams, wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import { error, serverError, success } from "../lib/response.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI;

const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

const appleCallbackSchema = z.object({
  code: z.string().min(1),
  id_token: z.string().optional(),
  state: z.string().optional(),
  user: z.string().optional(),
});

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

interface AppleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

interface AppleIdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
  auth_time: number;
  nonce_supported: boolean;
}

function decodeJwtPayload<T>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payload) as T;
}

async function generateAppleClientSecret(): Promise<string> {
  if (
    !APPLE_TEAM_ID ||
    !APPLE_KEY_ID ||
    !APPLE_PRIVATE_KEY ||
    !APPLE_CLIENT_ID
  ) {
    throw new Error("Apple OAuth not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 86400 * 180;

  const header = { alg: "ES256", kid: APPLE_KEY_ID };
  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: expiry,
    aud: "https://appleid.apple.com",
    sub: APPLE_CLIENT_ID,
  };

  const crypto = await import("crypto");
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signingInput}.${signature}`;
}

async function findOrCreateOAuthUser(
  email: string,
  name: string | null,
  avatarUrl: string | null,
  provider: "google" | "apple",
  providerId: string
) {
  let user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        avatarUrl,
        oauthProvider: provider,
        oauthProviderId: providerId,
      })
      .returning();
    user = newUser;
  } else if (!user.oauthProvider) {
    const [updatedUser] = await db
      .update(users)
      .set({
        oauthProvider: provider,
        oauthProviderId: providerId,
        ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
        ...(name && !user.name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    user = updatedUser;
  } else if (user.oauthProvider === provider) {
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (user.oauthProviderId !== providerId) {
      updates.oauthProviderId = providerId;
    }
    if (avatarUrl && !user.avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }
    if (name && !user.name) {
      updates.name = name;
    }

    if (Object.keys(updates).length > 1) {
      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, user.id))
        .returning();
      user = updatedUser;
    }
  }

  return user;
}

function isGoogleOAuthEnabled(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}

function isAppleOAuthEnabled(): boolean {
  return !!(
    APPLE_CLIENT_ID &&
    APPLE_TEAM_ID &&
    APPLE_KEY_ID &&
    APPLE_PRIVATE_KEY &&
    APPLE_REDIRECT_URI
  );
}

async function _getGoogleAuthUrl(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  if (!isGoogleOAuthEnabled()) {
    return error("Google OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
  }

  const url = new URL(req.url);
  const state = url.searchParams.get("state") || "";

  const clientId = GOOGLE_CLIENT_ID!;
  const redirectUri = GOOGLE_REDIRECT_URI!;

  const oauthParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return success({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${oauthParams.toString()}`,
  });
}

async function _handleGoogleCallback(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    if (!isGoogleOAuthEnabled()) {
      return error("Google OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = googleCallbackSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid callback data", 400, "VALIDATION_ERROR");
    }

    const { code } = parsed.data;

    const clientId = GOOGLE_CLIENT_ID!;
    const clientSecret = GOOGLE_CLIENT_SECRET!;
    const redirectUri = GOOGLE_REDIRECT_URI!;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error(
        "Google token exchange failed:",
        await tokenResponse.text()
      );
      return error("Failed to authenticate with Google", 400, "OAUTH_FAILED");
    }

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      console.error("Google user info failed:", await userInfoResponse.text());
      return error("Failed to get user info from Google", 400, "OAUTH_FAILED");
    }

    const googleUser = (await userInfoResponse.json()) as GoogleUserInfo;

    if (!googleUser.verified_email || !googleUser.email) {
      return error("Email not verified with Google", 400, "EMAIL_NOT_VERIFIED");
    }

    const user = await findOrCreateOAuthUser(
      googleUser.email,
      googleUser.name || null,
      googleUser.picture || null,
      "google",
      googleUser.id
    );

    const jwtTokens = await generateTokens(user.id, user.email);

    return success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences || {},
      },
      ...jwtTokens,
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    return serverError("Failed to authenticate with Google");
  }
}

async function _getAppleAuthUrl(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  if (!isAppleOAuthEnabled()) {
    return error("Apple OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
  }

  const url = new URL(req.url);
  const state = url.searchParams.get("state") || "";

  const clientId = APPLE_CLIENT_ID!;
  const redirectUri = APPLE_REDIRECT_URI!;

  const oauthParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code id_token",
    response_mode: "form_post",
    scope: "name email",
    state,
  });

  return success({
    url: `https://appleid.apple.com/auth/authorize?${oauthParams.toString()}`,
  });
}

async function _handleAppleCallback(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    if (!isAppleOAuthEnabled()) {
      return error("Apple OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
    }

    let bodyData: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";
    const rawBody = await req.text();

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formParams = new URLSearchParams(rawBody);
      for (const [key, value] of formParams.entries()) {
        bodyData[key] = value;
      }
    } else {
      bodyData = JSON.parse(rawBody || "{}");
    }

    const parsed = appleCallbackSchema.safeParse(bodyData);

    if (!parsed.success) {
      return error("Invalid callback data", 400, "VALIDATION_ERROR");
    }

    const { code, id_token, user: userJson } = parsed.data;

    const clientSecret = await generateAppleClientSecret();

    const clientId = APPLE_CLIENT_ID!;
    const redirectUri = APPLE_REDIRECT_URI!;

    const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Apple token exchange failed:", await tokenResponse.text());
      return error("Failed to authenticate with Apple", 400, "OAUTH_FAILED");
    }

    const tokens = (await tokenResponse.json()) as AppleTokenResponse;

    const idToken = id_token || tokens.id_token;
    const applePayload = decodeJwtPayload<AppleIdTokenPayload>(idToken);

    if (!applePayload.email) {
      return error("Email not provided by Apple", 400, "EMAIL_NOT_PROVIDED");
    }

    let userName: string | null = null;
    if (userJson) {
      try {
        const userInfo = JSON.parse(userJson);
        if (userInfo.name) {
          userName = [userInfo.name.firstName, userInfo.name.lastName]
            .filter(Boolean)
            .join(" ");
        }
      } catch {
        // Ignore parsing errors
      }
    }

    const user = await findOrCreateOAuthUser(
      applePayload.email,
      userName,
      null,
      "apple",
      applePayload.sub
    );

    const jwtTokens = await generateTokens(user.id, user.email);

    return success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences || {},
      },
      ...jwtTokens,
    });
  } catch (err) {
    console.error("Apple OAuth error:", err);
    return serverError("Failed to authenticate with Apple");
  }
}

export const getGoogleAuthUrl = wrapHandler(_getGoogleAuthUrl, {
  limiter: rateLimiters.auth,
  useUserId: false,
});

export const handleGoogleCallback = wrapHandler(_handleGoogleCallback, {
  limiter: rateLimiters.authVerify,
  useUserId: false,
});

export const getAppleAuthUrl = wrapHandler(_getAppleAuthUrl, {
  limiter: rateLimiters.auth,
  useUserId: false,
});

export const handleAppleCallback = wrapHandler(_handleAppleCallback, {
  limiter: rateLimiters.authVerify,
  useUserId: false,
});
