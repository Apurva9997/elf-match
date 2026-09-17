import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type AppRateLimiter = {
  limit: (identifier: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

function createLimiter(
  window: Duration,
  max: number,
  prefix: string
): AppRateLimiter {
  let limiter: Ratelimit | undefined;

  return {
    async limit(identifier: string) {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) {
        return { success: true, limit: 0, remaining: 0, reset: Date.now() };
      }

      if (!limiter) {
        limiter = new Ratelimit({
          redis: new Redis({ url, token }),
          limiter: Ratelimit.slidingWindow(max, window),
          analytics: true,
          prefix,
        });
      }

      return limiter.limit(identifier);
    },
  };
}

export const rateLimiters = {
  auth: createLimiter("15 m", 5, "@ratelimit/auth"),
  authVerify: createLimiter("15 m", 10, "@ratelimit/auth-verify"),
  authenticatedRead: createLimiter("1 m", 100, "@ratelimit/read"),
  authenticatedWrite: createLimiter("1 m", 30, "@ratelimit/write"),
  inviteMembers: createLimiter("1 h", 50, "@ratelimit/invite"),
  assignment: createLimiter("1 h", 5, "@ratelimit/assign"),
  reminders: createLimiter("1 h", 10, "@ratelimit/reminders"),
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
  limiter: AppRateLimiter,
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
