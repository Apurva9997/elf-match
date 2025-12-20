import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "../db/index.js";
import { generateTokens } from "../lib/auth.js";
import { wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import { error, serverError, success } from "../lib/response.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Apple OAuth configuration
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI;

// Validation schemas
const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

const appleCallbackSchema = z.object({
  code: z.string().min(1),
  id_token: z.string().optional(),
  state: z.string().optional(),
  user: z.string().optional(), // Apple sends user info as JSON string on first auth
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
  sub: string; // Apple's unique user ID
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
  auth_time: number;
  nonce_supported: boolean;
}

// Helper to decode JWT without verification (we trust Apple's response)
function decodeJwtPayload<T>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payload) as T;
}

// Generate Apple client secret (JWT)
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
  const expiry = now + 86400 * 180; // 180 days

  const header = {
    alg: "ES256",
    kid: APPLE_KEY_ID,
  };

  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: expiry,
    aud: "https://appleid.apple.com",
    sub: APPLE_CLIENT_ID,
  };

  // Import the private key and sign
  const crypto = await import("crypto");
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${headerB64}.${payloadB64}`;

  // The private key should be in PEM format
  const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signingInput}.${signature}`;
}

// Find or create user from OAuth data
async function findOrCreateOAuthUser(
  email: string,
  name: string | null,
  avatarUrl: string | null,
  provider: "google" | "apple",
  providerId: string
) {
  // First, try to find by email (allows linking existing accounts)
  // This ensures users can use either magic link or OAuth with the same email
  let user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    // Create new user with OAuth provider
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
    // Link OAuth to existing magic link user
    // This allows users who signed up with magic link to also use OAuth
    const [updatedUser] = await db
      .update(users)
      .set({
        oauthProvider: provider,
        oauthProviderId: providerId,
        // Update avatar if user doesn't have one
        ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
        // Update name if user doesn't have one
        ...(name && !user.name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    user = updatedUser;
  } else if (user.oauthProvider === provider) {
    // User already has this OAuth provider - update provider ID if it changed
    // and update profile info if needed
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
    
    if (Object.keys(updates).length > 1) { // More than just updatedAt
      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, user.id))
        .returning();
      user = updatedUser;
    }
  }
  // If user has a different OAuth provider, we just return the existing user
  // This prevents account duplication while allowing login

  return user;
}

// Check if Google OAuth is enabled
function isGoogleOAuthEnabled(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}

// Check if Apple OAuth is enabled
function isAppleOAuthEnabled(): boolean {
  return !!(
    APPLE_CLIENT_ID &&
    APPLE_TEAM_ID &&
    APPLE_KEY_ID &&
    APPLE_PRIVATE_KEY &&
    APPLE_REDIRECT_URI
  );
}

// Get Google OAuth URL
async function _getGoogleAuthUrl(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  if (!isGoogleOAuthEnabled()) {
    return error("Google OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
  }

  const state = event.queryStringParameters?.state || "";

  // TypeScript: We know these are defined because isGoogleOAuthEnabled() passed
  const clientId = GOOGLE_CLIENT_ID!;
  const redirectUri = GOOGLE_REDIRECT_URI!;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return success({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
}

// Handle Google OAuth callback
async function _handleGoogleCallback(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    if (!isGoogleOAuthEnabled()) {
      return error("Google OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
    }

    const body = JSON.parse(event.body || "{}");
    const parsed = googleCallbackSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid callback data", 400, "VALIDATION_ERROR");
    }

    const { code } = parsed.data;

    // TypeScript: We know these are defined because isGoogleOAuthEnabled() passed
    const clientId = GOOGLE_CLIENT_ID!;
    const clientSecret = GOOGLE_CLIENT_SECRET!;
    const redirectUri = GOOGLE_REDIRECT_URI!;

    // Exchange code for tokens
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

    // Get user info
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

    // Find or create user
    const user = await findOrCreateOAuthUser(
      googleUser.email,
      googleUser.name || null,
      googleUser.picture || null,
      "google",
      googleUser.id
    );

    // Generate JWT tokens
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

// Get Apple OAuth URL
async function _getAppleAuthUrl(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  if (!isAppleOAuthEnabled()) {
    return error("Apple OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
  }

  const state = event.queryStringParameters?.state || "";

  // TypeScript: We know these are defined because isAppleOAuthEnabled() passed
  const clientId = APPLE_CLIENT_ID!;
  const redirectUri = APPLE_REDIRECT_URI!;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code id_token",
    response_mode: "form_post",
    scope: "name email",
    state,
  });

  return success({
    url: `https://appleid.apple.com/auth/authorize?${params.toString()}`,
  });
}

// Handle Apple OAuth callback
async function _handleAppleCallback(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    if (!isAppleOAuthEnabled()) {
      return error("Apple OAuth not configured", 503, "OAUTH_NOT_CONFIGURED");
    }

    // Apple sends data as form POST
    let body: Record<string, string> = {};

    // Handle both JSON and form-urlencoded
    const contentType = event.headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(event.body || "");
      for (const [key, value] of params.entries()) {
        body[key] = value;
      }
    } else {
      body = JSON.parse(event.body || "{}");
    }

    const parsed = appleCallbackSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid callback data", 400, "VALIDATION_ERROR");
    }

    const { code, id_token, user: userJson } = parsed.data;

    // Generate client secret
    const clientSecret = await generateAppleClientSecret();

    // TypeScript: We know these are defined because isAppleOAuthEnabled() passed
    const clientId = APPLE_CLIENT_ID!;
    const redirectUri = APPLE_REDIRECT_URI!;

    // Exchange code for tokens
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

    // Decode the ID token to get user info
    const idToken = id_token || tokens.id_token;
    const applePayload = decodeJwtPayload<AppleIdTokenPayload>(idToken);

    if (!applePayload.email) {
      return error("Email not provided by Apple", 400, "EMAIL_NOT_PROVIDED");
    }

    // Parse user info if provided (only on first authorization)
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

    // Find or create user
    const user = await findOrCreateOAuthUser(
      applePayload.email,
      userName,
      null, // Apple doesn't provide avatar
      "apple",
      applePayload.sub
    );

    // Generate JWT tokens
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

// Export wrapped handlers with rate limiting
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
