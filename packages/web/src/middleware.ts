import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/auth/login(.*)",
  "/auth/verify(.*)",
  "/auth/callback(.*)",
  "/sso-callback(.*)",
  "/invite/(.*)",
  "/faq(.*)",
  "/features(.*)",
  "/how-it-works(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/family-and-office(.*)",
  "/secret-santa-with-exclusions(.*)",
  "/api(.*)",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
  "/share.jpg",
]);

const isAuthRoute = createRouteMatcher([
  "/auth/login(.*)",
  "/auth/verify(.*)",
]);

function signedOut(req: { cookies: { has: (name: string) => boolean; get: (name: string) => { value: string } | undefined } }) {
  if (req.cookies.has("__session")) return false;
  // Clerk sets this to "0" after a signed-out visit. Only a real
  // timestamp means a session may still need a handshake.
  const updatedAt = req.cookies.get("__client_uat")?.value;
  return !updatedAt || updatedAt === "0";
}

export default clerkMiddleware(async (auth, req) => {
  // Skip the Clerk handshake for a signed-out visitor. Otherwise every
  // public navigation waits on clerk.elfmatch.com before the document.
  if (signedOut(req)) {
    if (!isPublicRoute(req)) {
      const path = req.nextUrl.pathname;
      const isAppSurface =
        path.startsWith("/dashboard") || path.startsWith("/api");
      if (!isAppSurface) {
        return NextResponse.rewrite(new URL("/not-found", req.url));
      }
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const { userId } = await auth();

  // Redirect authenticated users away from auth pages. An invitation
  // carried in the login URL must survive that bounce.
  if (userId && isAuthRoute(req)) {
    const requested = req.nextUrl.searchParams.get("redirect") || "";
    const destination =
      requested.startsWith("/invite/") && !requested.startsWith("//")
        ? requested
        : "/dashboard";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  // Protect non-public routes
  if (!isPublicRoute(req) && !userId) {
    const path = req.nextUrl.pathname;
    const isAppSurface =
      path.startsWith("/dashboard") || path.startsWith("/api");

    // An unknown public URL must 404. Sending it to sign-in hides the
    // not-found page and teaches crawlers that every typo is a login.
    if (!isAppSurface) {
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }

    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // /api must stay in the matcher. On Netlify, paths excluded from
  // middleware never reach the Next.js server, so app/api/[...path]
  // would 404 at the CDN. /api is still a public route above, so
  // Clerk will not redirect those requests to login.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm)).*)",
    "/(api|trpc)(.*)",
  ],
};
