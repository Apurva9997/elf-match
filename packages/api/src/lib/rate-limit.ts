import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limit configurations
export const rateLimiters = {
  // Auth endpoints - strict limits
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
    analytics: true,
    prefix: "@ratelimit/auth",
  }),

  authVerify: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "15 m"), // 10 requests per 15 minutes
    analytics: true,
    prefix: "@ratelimit/auth-verify",
  }),

  // General authenticated reads
  authenticatedRead: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
    analytics: true,
    prefix: "@ratelimit/read",
  }),

  // General authenticated writes
  authenticatedWrite: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 requests per minute
    analytics: true,
    prefix: "@ratelimit/write",
  }),

  // Invitation sending
  inviteMembers: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 h"), // 50 requests per hour
    analytics: true,
    prefix: "@ratelimit/invite",
  }),

  // Assignment operations (critical)
  assignment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"), // 5 requests per hour
    analytics: true,
    prefix: "@ratelimit/assign",
  }),

  // Reminder emails
  reminders: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour
    analytics: true,
    prefix: "@ratelimit/reminders",
  }),
};

// Helper to get identifier from event (IP or userId)
export function getIdentifier(
  event: APIGatewayProxyEventV2,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from various possible headers
  const ip =
    event.requestContext.http.sourceIp ||
    event.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    event.headers["x-real-ip"] ||
    "unknown";

  return `ip:${ip}`;
}

// Rate limit check function
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}
