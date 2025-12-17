import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  assignments,
  db,
  teamMembers,
  wishItems,
  wishlists,
} from "../db/index.js";
import { getUserFromEvent } from "../lib/auth.js";
import { wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import {
  error,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "../lib/response.js";

const wishItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  priceEstimate: z.number().positive().optional(),
  priority: z.number().int().min(0).max(10).optional(),
});

const updateWishlistSchema = z.object({
  items: z.array(wishItemSchema),
});

async function getMembershipForTeam(userId: string, teamId: string) {
  return db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.invitationStatus, "accepted")
    ),
  });
}

async function _getWishlist(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    // Get or create wishlist
    let wishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.teamMemberId, membership.id),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.priority)],
        },
      },
    });

    if (!wishlist) {
      // Create empty wishlist
      const [newWishlist] = await db
        .insert(wishlists)
        .values({ teamMemberId: membership.id })
        .returning();

      wishlist = { ...newWishlist, items: [] };
    }

    return success(wishlist);
  } catch (err) {
    console.error("Error getting wishlist:", err);
    return serverError("Failed to get wishlist");
  }
}

async function _updateWishlist(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    const body = JSON.parse(event.body || "{}");
    const parsed = updateWishlistSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid wishlist data", 400, "VALIDATION_ERROR");
    }

    const { items } = parsed.data;

    // Get or create wishlist
    let wishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.teamMemberId, membership.id),
    });

    if (!wishlist) {
      const [newWishlist] = await db
        .insert(wishlists)
        .values({ teamMemberId: membership.id })
        .returning();
      wishlist = newWishlist;
    }

    // Delete existing items and insert new ones
    await db.delete(wishItems).where(eq(wishItems.wishlistId, wishlist.id));

    if (items.length > 0) {
      await db.insert(wishItems).values(
        items.map((item, index) => ({
          wishlistId: wishlist!.id,
          title: item.title,
          description: item.description,
          url: item.url || null,
          priceEstimate: item.priceEstimate?.toString(),
          priority: item.priority ?? index,
        }))
      );
    }

    // Update wishlist timestamp
    await db
      .update(wishlists)
      .set({ updatedAt: new Date() })
      .where(eq(wishlists.id, wishlist.id));

    // Fetch updated wishlist
    const updatedWishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.id, wishlist.id),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.priority)],
        },
      },
    });

    return success(updatedWishlist);
  } catch (err) {
    console.error("Error updating wishlist:", err);
    return serverError("Failed to update wishlist");
  }
}

async function _getGifteeWishlist(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    // Find the assignment where this user is the giver
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.teamId, teamId),
        eq(assignments.giverId, membership.id)
      ),
      with: {
        receiver: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            wishlist: {
              with: {
                items: {
                  orderBy: (items, { asc }) => [asc(items.priority)],
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return notFound(
        "No assignment found. Assignments may not have been made yet."
      );
    }

    // Mark as revealed if first time viewing
    if (!assignment.revealedAt) {
      await db
        .update(assignments)
        .set({ revealedAt: new Date() })
        .where(eq(assignments.id, assignment.id));
    }

    return success({
      giftee: {
        name: assignment.receiver.user?.name || "Unknown",
        avatarUrl: assignment.receiver.user?.avatarUrl,
      },
      wishlist: assignment.receiver.wishlist,
      giftStatus: assignment.giftStatus,
    });
  } catch (err) {
    console.error("Error getting giftee wishlist:", err);
    return serverError("Failed to get giftee wishlist");
  }
}

// Export wrapped handlers
export const getWishlist = wrapHandler(_getWishlist, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const updateWishlist = wrapHandler(_updateWishlist, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const getGifteeWishlist = wrapHandler(_getGifteeWishlist, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});
