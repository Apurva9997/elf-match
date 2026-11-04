import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  assignments,
  db,
  teamMembers,
  wishItems,
  wishlists,
} from "../db/index.js";
import { getUserFromRequest } from "../lib/auth.js";
import { type RouteParams, wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import {
  error,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "../lib/response.js";
import { openWishlistText, sealWishlistText } from "../lib/encryption.js";
import { sanitizeTransform } from "../lib/sanitize.js";

const wishItemSchema = z.object({
  title: z.string().min(1).max(255).transform(sanitizeTransform("text")),
  description: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeTransform("richText")(val) : val)),
  url: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((val) => {
      if (!val) return val;
      const withProtocol = /^https?:\/\//i.test(val) ? val : `https://${val}`;
      return sanitizeTransform("url")(withProtocol);
    }),
  priceEstimate: z.number().positive().max(1_000_000).optional().nullable(),
  priority: z.number().int().min(0).max(10).optional(),
});

const updateWishlistSchema = z.object({
  items: z.array(wishItemSchema),
  // Absent means this save does not change the decline. A wish clears it.
  skipped: z.boolean().optional(),
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

type StoredWishItem = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  priceEstimate: string | null;
  priority: number | null;
};

/**
 * Opens a wishlist for the membership that wrote it.
 * Callers must already have checked that this request may see that membership:
 * the writer, or the giver assigned to them. A database reader who is not
 * this process cannot run this step.
 */
function presentWishlist<T extends { items?: StoredWishItem[] } | null | undefined>(
  wishlist: T,
  teamMemberId: string
): T {
  if (!wishlist?.items) return wishlist;
  return {
    ...wishlist,
    items: wishlist.items.map((item) => ({
      ...item,
      title: openWishlistText(item.title, teamMemberId) ?? "",
      description: openWishlistText(item.description, teamMemberId),
      url: openWishlistText(item.url, teamMemberId),
    })),
  };
}

async function _getWishlist(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    let wishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.teamMemberId, membership.id),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.priority)],
        },
      },
    });

    if (!wishlist) {
      const [newWishlist] = await db
        .insert(wishlists)
        .values({ teamMemberId: membership.id })
        .returning();

      wishlist = { ...newWishlist, items: [] };
    }

    return success(presentWishlist(wishlist, membership.id));
  } catch (err) {
    console.error("Error getting wishlist:", err);
    return serverError("Failed to get wishlist");
  }
}

async function _updateWishlist(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = updateWishlistSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid wishlist data", 400, "VALIDATION_ERROR");
    }

    const { items } = parsed.data;
    // Writing a wish is the opposite of declining the letter.
    const skipped = items.length > 0 ? false : parsed.data.skipped;

    let wishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.teamMemberId, membership.id),
    });

    if (!wishlist) {
      const [newWishlist] = await db
        .insert(wishlists)
        .values({
          teamMemberId: membership.id,
          skipped: skipped ?? false,
        })
        .returning();
      wishlist = newWishlist;
    }

    await db.delete(wishItems).where(eq(wishItems.wishlistId, wishlist.id));

    if (items.length > 0) {
      await db.insert(wishItems).values(
        items.map((item, index) => ({
          wishlistId: wishlist!.id,
          title: sealWishlistText(item.title, membership.id)!,
          description: sealWishlistText(item.description, membership.id),
          url: sealWishlistText(item.url, membership.id),
          priceEstimate: item.priceEstimate?.toString() ?? null,
          priority: item.priority ?? index,
        }))
      );
    }

    await db
      .update(wishlists)
      .set({
        updatedAt: new Date(),
        ...(skipped === undefined ? {} : { skipped }),
      })
      .where(eq(wishlists.id, wishlist.id));

    const updatedWishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.id, wishlist.id),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.priority)],
        },
      },
    });

    return success(presentWishlist(updatedWishlist, membership.id));
  } catch (err) {
    console.error("Error updating wishlist:", err);
    return serverError("Failed to update wishlist");
  }
}

async function _getGifteeWishlist(
  req: Request,
  params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const teamId = params.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

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
        "No draw yet."
      );
    }

    return success({
      giftee: {
        name: assignment.receiver.user?.name || "Unknown",
        avatarUrl: assignment.receiver.user?.avatarUrl,
      },
      wishlist: presentWishlist(
        assignment.receiver.wishlist,
        assignment.receiverId
      ),
      giftStatus: assignment.giftStatus,
    });
  } catch (err) {
    console.error("Error getting giftee wishlist:", err);
    return serverError("Couldn't load their wishlist. Try again.");
  }
}

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
