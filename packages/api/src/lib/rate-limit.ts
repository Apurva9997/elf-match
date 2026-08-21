import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
    prefix: "@ratelimit/auth",
  }),

  authVerify: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "15 m"),
    analytics: true,
    prefix: "@ratelimit/auth-verify",
  }),

  authenticatedRead: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "@ratelimit/read",
  }),

  authenticatedWrite: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "@ratelimit/write",
  }),

  inviteMembers: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 h"),
    analytics: true,
    prefix: "@ratelimit/invite",
  }),

  assignment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "@ratelimit/assign",
  }),

  reminders: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "@ratelimit/reminders",
  }),
};

export function getIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  const ip =
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return `ip:${ip}`;
}

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
  return { success, limit, remaining, reset };
}
