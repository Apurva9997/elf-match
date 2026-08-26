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
  "/api(.*)",
  "/sitemap.xml",
  "/robots.txt",
]);

const isAuthRoute = createRouteMatcher([
  "/auth/login(.*)",
  "/auth/verify(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Redirect authenticated users away from auth pages
  if (userId && isAuthRoute(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect non-public routes
  if (!isPublicRoute(req) && !userId) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
