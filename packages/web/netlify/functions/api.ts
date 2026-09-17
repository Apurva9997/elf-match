import "../../../api/src/lib/sentry.js";
import { handleRequest } from "../../../api/src/router.js";

export const config = {
  // Mount on /api/* (and the default function URL the netlify.toml rewrite
  // targets). Declaring both keeps the function reachable whether Netlify
  // path-routing or the forced /api rewrite wins over Next.js.
  path: [
    "/api",
    "/api/*",
    "/.netlify/functions/api",
    "/.netlify/functions/api/*",
  ],
};

export default async (req: Request): Promise<Response> => {
  return handleRequest(req);
};
