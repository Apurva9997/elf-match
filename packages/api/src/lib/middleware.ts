import type { Ratelimit } from "@upstash/ratelimit";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { checkRateLimit, getIdentifier } from "./rate-limit.js";
import { wrapHandler as wrapSentry } from "./sentry.js";

type LambdaHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResult>;

interface RateLimitOptions {
  limiter: Ratelimit;
  useUserId?: boolean; // If true, extract userId from JWT
}

/**
 * Wrap handler with rate limiting
 */
export function withRateLimit(
  handler: LambdaHandler,
  options: RateLimitOptions
): LambdaHandler {
  return async (event, context, callback): Promise<APIGatewayProxyResult> => {
    try {
      // Get identifier
      let identifier: string;

      if (options.useUserId) {
        // Extract userId from JWT token
        const authHeader =
          event.headers.authorization || event.headers.Authorization;
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.slice(7);
          try {
            // Simple JWT decode (payload only, we already verified in handler)
            const payload = JSON.parse(
              Buffer.from(token.split(".")[1], "base64").toString()
            );
            identifier = getIdentifier(event, payload.userId);
          } catch {
            // If token decode fails, fall back to IP-based limiting
            identifier = getIdentifier(event);
          }
        } else {
          identifier = getIdentifier(event);
        }
      } else {
        identifier = getIdentifier(event);
      }

      // Check rate limit
      const { success, limit, remaining, reset } = await checkRateLimit(
        options.limiter,
        identifier
      );

      // Add rate limit headers to response
      const rateLimitHeaders = {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      };

      if (!success) {
        const rateLimitResponse: APIGatewayProxyResult = {
          statusCode: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin":
              process.env.FRONTEND_URL || "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
            ...rateLimitHeaders,
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
          body: JSON.stringify({
            success: false,
            error: {
              message: "Too many requests. Please try again later.",
              code: "RATE_LIMIT_EXCEEDED",
              retryAfter: reset,
            },
          }),
        };
        return rateLimitResponse;
      }

      // Execute handler
      const response = await handler(event, context, callback);

      // Ensure we always return a proper response
      if (!response) {
        throw new Error("Handler returned undefined");
      }

      // Add rate limit headers to successful response
      if (response.headers) {
        response.headers = {
          ...response.headers,
          ...rateLimitHeaders,
        };
      } else {
        response.headers = rateLimitHeaders;
      }

      return response;
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      // If rate limiting fails, allow request through (fail open)
      const fallbackResponse = await handler(event, context, callback);
      if (!fallbackResponse) {
        throw new Error("Handler returned undefined in error path");
      }
      return fallbackResponse;
    }
  };
}

/**
 * Convenience function to wrap with both Sentry and rate limiting
 */
export function wrapHandler(
  handler: LambdaHandler,
  rateLimitOptions?: RateLimitOptions
): LambdaHandler {
  let wrapped = handler;

  // Apply rate limiting if configured
  if (rateLimitOptions) {
    wrapped = withRateLimit(wrapped, rateLimitOptions);
  }

  // Apply Sentry wrapper
  wrapped = wrapSentry(wrapped);

  return wrapped;
}
