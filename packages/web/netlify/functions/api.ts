import "../../../api/src/lib/sentry.js";
import { handleRequest } from "../../../api/src/router.js";

export const config = {
  path: ["/auth/me", "/user/*", "/teams", "/teams/*", "/invitations/*"],
};

export default async (req: Request): Promise<Response> => {
  return handleRequest(req);
};
