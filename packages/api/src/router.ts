import * as addresses from "./handlers/addresses.js";
import * as admin from "./handlers/admin.js";
import * as assignments from "./handlers/assignments.js";
import * as auth from "./handlers/auth.js";
import * as exclusions from "./handlers/exclusions.js";
import * as invitations from "./handlers/invitations.js";
import * as profile from "./handlers/profile.js";
import * as teams from "./handlers/teams.js";
import * as userPreferences from "./handlers/user-preferences.js";
import * as wishlists from "./handlers/wishlists.js";

type RouteParams = Record<string, string>;
type Handler = (req: Request, params: RouteParams) => Promise<Response>;

interface Route {
  method: string;
  pattern: string;
  handler: Handler;
}

const routes: Route[] = [
  // Auth (Clerk handles sign-in; this just returns local user data)
  { method: "GET", pattern: "/auth/me", handler: auth.getMe },

  // User preferences
  { method: "GET", pattern: "/user/preferences", handler: userPreferences.getUserPreferences },
  { method: "PATCH", pattern: "/user/preferences", handler: userPreferences.updateUserPreferences },

  // Profile
  { method: "GET", pattern: "/user/profile", handler: profile.getProfile },
  { method: "PATCH", pattern: "/user/profile", handler: profile.updateProfile },

  // Invitations (before /teams/:teamId routes to avoid conflicts)
  { method: "GET", pattern: "/invitations/pending", handler: invitations.listPendingInvitations },
  { method: "GET", pattern: "/invitations/:token", handler: invitations.previewInvitation },
  { method: "POST", pattern: "/invitations/:token/accept", handler: invitations.acceptInvitation },
  { method: "POST", pattern: "/invitations/:invitationId/accept-direct", handler: invitations.acceptInvitationDirect },
  { method: "POST", pattern: "/invitations/:token/decline", handler: invitations.declineInvitation },
  { method: "POST", pattern: "/invitations/:invitationId/decline-direct", handler: invitations.declineInvitationDirect },

  // Teams
  { method: "POST", pattern: "/teams", handler: teams.createTeam },
  { method: "GET", pattern: "/teams", handler: teams.listTeams },
  { method: "GET", pattern: "/teams/:teamId", handler: teams.getTeam },
  { method: "PATCH", pattern: "/teams/:teamId", handler: teams.updateTeam },
  { method: "DELETE", pattern: "/teams/:teamId", handler: teams.deleteTeam },
  { method: "GET", pattern: "/teams/:teamId/status", handler: teams.getTeamStatus },

  // Team invitations / members
  { method: "POST", pattern: "/teams/:teamId/invite", handler: invitations.inviteMembers },
  { method: "DELETE", pattern: "/teams/:teamId/members/:memberId", handler: invitations.removeMember },
  { method: "POST", pattern: "/teams/:teamId/members/:memberId/cancel", handler: invitations.cancelInvitation },
  { method: "POST", pattern: "/teams/:teamId/members/:memberId/resend", handler: invitations.resendInvitation },

  // Wishlists
  { method: "GET", pattern: "/teams/:teamId/wishlist", handler: wishlists.getWishlist },
  { method: "PUT", pattern: "/teams/:teamId/wishlist", handler: wishlists.updateWishlist },
  { method: "GET", pattern: "/teams/:teamId/giftee/wishlist", handler: wishlists.getGifteeWishlist },

  // Addresses
  { method: "GET", pattern: "/teams/:teamId/address", handler: addresses.getAddress },
  { method: "PUT", pattern: "/teams/:teamId/address", handler: addresses.updateAddress },
  { method: "GET", pattern: "/teams/:teamId/giftee/address", handler: addresses.getGifteeAddress },

  // Assignments (preview before assign to match more specific first)
  { method: "POST", pattern: "/teams/:teamId/assign/preview", handler: assignments.previewAssignment },
  { method: "POST", pattern: "/teams/:teamId/assign/notify", handler: assignments.retryAssignmentEmails },
  { method: "POST", pattern: "/teams/:teamId/assign", handler: assignments.triggerAssignment },
  { method: "GET", pattern: "/teams/:teamId/assignment", handler: assignments.getAssignment },
  { method: "PATCH", pattern: "/teams/:teamId/assignment", handler: assignments.updateAssignment },

  // Exclusions
  { method: "GET", pattern: "/teams/:teamId/exclusions", handler: exclusions.listExclusions },
  { method: "POST", pattern: "/teams/:teamId/exclusions", handler: exclusions.addExclusion },
  { method: "DELETE", pattern: "/teams/:teamId/exclusions/:exclusionId", handler: exclusions.removeExclusion },

  // Admin
  { method: "POST", pattern: "/teams/:teamId/reminders", handler: admin.sendReminders },
  { method: "PATCH", pattern: "/teams/:teamId/users/:userId/email", handler: admin.changeUserEmail },
];

function matchPattern(pattern: string, pathname: string): RouteParams | null {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");

  if (patternParts.length !== pathParts.length) return null;

  const params: RouteParams = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Netlify's rewrite may pass either the original /api path or the internal
  // function path. Normalize both forms before matching application routes.
  const functionPrefix = "/.netlify/functions/api";
  const apiPrefix = "/api";
  const stripPrefix = (pathname: string, prefix: string) => {
    if (pathname === prefix) return "/";
    return pathname.startsWith(`${prefix}/`)
      ? pathname.slice(prefix.length)
      : null;
  };
  const pathname =
    stripPrefix(url.pathname, functionPrefix) ??
    stripPrefix(url.pathname, apiPrefix) ??
    url.pathname;
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  for (const route of routes) {
    if (route.method !== method) continue;

    const params = matchPattern(route.pattern, pathname);
    if (params !== null) {
      return route.handler(req, params);
    }
  }

  return new Response(
    JSON.stringify({ success: false, error: "Not Found" }),
    {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}
