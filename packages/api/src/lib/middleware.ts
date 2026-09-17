import { Sentry } from "./sentry.js";
import {
  checkRateLimit,
  getIdentifier,
  type AppRateLimiter,
} from "./rate-limit.js";

export type RouteParams = Record<string, string>;
export type NetlifyHandler = (
  req: Request,
  params: RouteParams
) => Promise<Response>;

interface RateLimitOptions {
  limiter: AppRateLimiter;
  useUserId?: boolean;
}

const corsOrigin = () =>
  process.env.FRONTEND_URL || "http://localhost:3000";

function rateLimitExceededResponse(reset: number, headers: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: reset,
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": corsOrigin(),
        "Access-Control-Allow-Credentials": "true",
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        ...headers,
      },
    }
  );
}

export function wrapHandler(
  handler: NetlifyHandler,
  rateLimitOptions?: RateLimitOptions
): NetlifyHandler {
  return async (req: Request, params: RouteParams): Promise<Response> => {
    try {
      if (!rateLimitOptions) {
        return await handler(req, params);
      }

      let identifier: string;
      if (rateLimitOptions.useUserId) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          try {
            const token = authHeader.slice(7);
            const payload = JSON.parse(
              Buffer.from(token.split(".")[1], "base64").toString()
            );
            identifier = getIdentifier(req, payload.userId);
          } catch {
            identifier = getIdentifier(req);
          }
        } else {
          identifier = getIdentifier(req);
        }
      } else {
        identifier = getIdentifier(req);
      }

      const { success, limit, remaining, reset } = await checkRateLimit(
        rateLimitOptions.limiter,
        identifier
      );

      const rateLimitHeaders = {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      };

      if (!success) {
        return rateLimitExceededResponse(reset, rateLimitHeaders);
      }

      const response = await handler(req, params);

      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        newHeaders.set(key, value);
      }
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (err) {
      Sentry.captureException(err);
      console.error("Handler error:", err);
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: "Internal server error", code: "SERVER_ERROR" },
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": corsOrigin(),
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }
  };
}
