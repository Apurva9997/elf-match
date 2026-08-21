import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  assignments,
  db,
  teamMembers,
  userAddresses,
} from "../db/index.js";
import { getUserFromRequest } from "../lib/auth.js";
import { decryptAddress, encryptAddress } from "../lib/encryption.js";
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
import { sanitizeTransform } from "../lib/sanitize.js";

const addressSchema = z.object({
  streetLine1: z.string().min(1).max(255).transform(sanitizeTransform("text")),
  streetLine2: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val ? sanitizeTransform("text")(val) : val)),
  city: z.string().min(1).max(100).transform(sanitizeTransform("text")),
  state: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val ? sanitizeTransform("text")(val) : val)),
  postalCode: z.string().min(1).max(20).transform(sanitizeTransform("text")),
  country: z.string().min(1).max(100).transform(sanitizeTransform("text")),
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

async function _getAddress(
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

    const address = await db.query.userAddresses.findFirst({
      where: eq(userAddresses.userId, user.id),
    });

    const decryptedAddress = decryptAddress(address);

    return success(decryptedAddress || null);
  } catch (err) {
    console.error("Error getting address:", err);
    return serverError("Failed to get address");
  }
}

async function _updateAddress(
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
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid address data", 400, "VALIDATION_ERROR");
    }

    const { streetLine1, streetLine2, city, state, postalCode, country } =
      parsed.data;

    const encryptedData = encryptAddress({
      streetLine1,
      streetLine2: streetLine2 || null,
      city,
      state: state || null,
      postalCode,
    });

    const existingAddress = await db.query.userAddresses.findFirst({
      where: eq(userAddresses.userId, user.id),
    });

    let address;
    if (existingAddress) {
      const [updated] = await db
        .update(userAddresses)
        .set({
          streetLine1: encryptedData.streetLine1!,
          streetLine2: encryptedData.streetLine2,
          city: encryptedData.city!,
          state: encryptedData.state,
          postalCode: encryptedData.postalCode!,
          country,
          updatedAt: new Date(),
        })
        .where(eq(userAddresses.id, existingAddress.id))
        .returning();
      address = updated;
    } else {
      const [created] = await db
        .insert(userAddresses)
        .values({
          userId: user.id,
          streetLine1: encryptedData.streetLine1!,
          streetLine2: encryptedData.streetLine2,
          city: encryptedData.city!,
          state: encryptedData.state,
          postalCode: encryptedData.postalCode!,
          country,
        })
        .returning();
      address = created;
    }

    const decryptedAddress = decryptAddress(address);

    return success(decryptedAddress);
  } catch (err) {
    console.error("Error updating address:", err);
    return serverError("Failed to update address");
  }
}

async function _getGifteeAddress(
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

    const gifteeUserId = assignment.receiver.user?.id;
    if (!gifteeUserId) {
      return success({
        giftee: {
          name: assignment.receiver.user?.name || "Unknown",
        },
        address: null,
        message: "Could not find giftee user.",
      });
    }

    const gifteeAddress = await db.query.userAddresses.findFirst({
      where: eq(userAddresses.userId, gifteeUserId),
    });

    if (!gifteeAddress) {
      return success({
        giftee: {
          name: assignment.receiver.user?.name || "Unknown",
        },
        address: null,
        message: "Your giftee has not added their address yet.",
      });
    }

    const decryptedAddress = decryptAddress(gifteeAddress);

    return success({
      giftee: {
        name: assignment.receiver.user?.name || "Unknown",
      },
      address: decryptedAddress,
    });
  } catch (err) {
    console.error("Error getting giftee address:", err);
    return serverError("Failed to get giftee address");
  }
}

export const getAddress = wrapHandler(_getAddress, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const updateAddress = wrapHandler(_updateAddress, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

export const getGifteeAddress = wrapHandler(_getGifteeAddress, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});
