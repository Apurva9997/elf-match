import "../../../api/src/lib/sentry.js";
import { handleRequest } from "../../../api/src/router.js";

export default async (req: Request): Promise<Response> => {
  return handleRequest(req);
};
