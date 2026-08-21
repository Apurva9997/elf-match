import { getUserFromRequest } from "../lib/auth.js";
import { type RouteParams, wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import { serverError, success, unauthorized } from "../lib/response.js";

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

export const getMe = wrapHandler(_getMe, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});
