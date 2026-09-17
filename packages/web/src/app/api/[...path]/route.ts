import { handleRequest } from "../../../../../api/src/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js on Netlify publishes this with the site. The standalone
// netlify/functions/api handler is not included in that deploy, so /api/*
// must be a Next.js route.
const handler = (req: Request) => handleRequest(req);

export {
  handler as DELETE,
  handler as GET,
  handler as OPTIONS,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
