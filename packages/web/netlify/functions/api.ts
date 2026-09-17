import "../../../api/src/lib/sentry.js";
import { handleRequest } from "../../../api/src/router.js";

// Kept for `netlify dev` in the API package. Production serves /api via
// Next.js src/app/api/[...path]/route.ts — do not claim /api here.
export default async (req: Request): Promise<Response> => {
  return handleRequest(req);
};
