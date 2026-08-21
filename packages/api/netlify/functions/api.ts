import "../../src/lib/sentry.js";
import { handleRequest } from "../../src/router.js";

export const config = {
  path: "/*",
};

export default async (req: Request): Promise<Response> => {
  return handleRequest(req);
};
