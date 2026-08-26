import "../../src/lib/sentry.js";
import { handleRequest } from "../../src/router.js";

export const config = {
  // Handle only the API routes. Using explicit paths instead of "/*" so
  // this function doesn't intercept Next.js page routes on the same site.
  // /auth/me is exact to avoid catching /auth/login or /auth/verify pages.
  path: ["/auth/me", "/user/*", "/teams/*", "/invitations/*"],
};

export default async (req: Request): Promise<Response> => {
  return handleRequest(req);
};
