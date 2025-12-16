import * as jose from "jose";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { db, users } from "../db/index.js";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);
const TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY = "30d";

export interface JWTPayload {
  userId: string;
  email: string;
  type: "access" | "refresh";
}

export async function generateTokens(userId: string, email: string) {
  const accessToken = await new jose.SignJWT({ userId, email, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  const refreshToken = await new jose.SignJWT({
    userId,
    email,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return { accessToken, refreshToken };
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getUserFromEvent(event: APIGatewayProxyEventV2) {
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);

  if (!payload || payload.type !== "access") {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  return user || null;
}

export function generateMagicLinkToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
