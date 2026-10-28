import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, userAddresses, users } from "../db/index.js";
import { forgetAccount } from "../lib/account.js";
import { getUserFromRequest } from "../lib/auth.js";
import {
  decryptAddress,
  decryptMobile,
  encryptAddress,
  encryptMobile,
} from "../lib/encryption.js";
import { type RouteParams, wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";
import {
  error,
  serverError,
  success,
  unauthorized,
} from "../lib/response.js";
import { sanitizeTransform } from "../lib/sanitize.js";

const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .transform((val) => (val ? sanitizeTransform("text")(val) : val)),
  mobile: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeTransform("text")(val) : val)),
  address: z
    .object({
      streetLine1: z
        .string()
        .min(1)
        .max(255)
        .transform(sanitizeTransform("text")),
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
      postalCode: z
        .string()
        .min(1)
        .max(20)
        .transform(sanitizeTransform("text")),
      country: z.string().min(1).max(100).transform(sanitizeTransform("text")),
    })
    .optional(),
});

async function _getProfile(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const userWithAddress = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        address: true,
      },
    });

    if (!userWithAddress) {
      return unauthorized("User not found");
    }

    const decryptedAddress = decryptAddress(userWithAddress.address);
    const decryptedMobile = decryptMobile(userWithAddress.mobile);

    return success({
      id: userWithAddress.id,
      email: userWithAddress.email,
      name: userWithAddress.name,
      mobile: decryptedMobile,
      avatarUrl: userWithAddress.avatarUrl,
      address: decryptedAddress
        ? {
            id: decryptedAddress.id,
            streetLine1: decryptedAddress.streetLine1,
            streetLine2: decryptedAddress.streetLine2,
            city: decryptedAddress.city,
            state: decryptedAddress.state,
            postalCode: decryptedAddress.postalCode,
            country: decryptedAddress.country,
          }
        : null,
    });
  } catch (err) {
    console.error("Error getting profile:", err);
    return serverError("Failed to get profile");
  }
}

async function _updateProfile(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const body = JSON.parse(await req.text() || "{}");
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid profile data", 400, "VALIDATION_ERROR");
    }

    const { name, mobile, address } = parsed.data;

    if (name !== undefined || mobile !== undefined) {
      const updateData: {
        name?: string;
        mobile?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };
      if (name !== undefined) updateData.name = name;

      if (mobile !== undefined) updateData.mobile = encryptMobile(mobile);

      await db.update(users).set(updateData).where(eq(users.id, user.id));
    }

    if (address) {
      const { streetLine1, streetLine2, city, state, postalCode, country } =
        address;

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

      if (existingAddress) {
        await db
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
          .where(eq(userAddresses.id, existingAddress.id));
      } else {
        await db.insert(userAddresses).values({
          userId: user.id,
          streetLine1: encryptedData.streetLine1!,
          streetLine2: encryptedData.streetLine2,
          city: encryptedData.city!,
          state: encryptedData.state,
          postalCode: encryptedData.postalCode!,
          country,
        });
      }
    }

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        address: true,
      },
    });

    if (!updatedUser) {
      return unauthorized("User not found");
    }

    const decryptedAddress = decryptAddress(updatedUser.address);
    const decryptedMobileUpdated = decryptMobile(updatedUser.mobile);

    return success({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      mobile: decryptedMobileUpdated,
      avatarUrl: updatedUser.avatarUrl,
      address: decryptedAddress
        ? {
            id: decryptedAddress.id,
            streetLine1: decryptedAddress.streetLine1,
            streetLine2: decryptedAddress.streetLine2,
            city: decryptedAddress.city,
            state: decryptedAddress.state,
            postalCode: decryptedAddress.postalCode,
            country: decryptedAddress.country,
          }
        : null,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return serverError("Failed to update profile");
  }
}

export const getProfile = wrapHandler(_getProfile, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const updateProfile = wrapHandler(_updateProfile, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});

async function _deleteAccount(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();

    const body = (await req.json().catch(() => null)) as { confirmation?: string } | null;
    if (body?.confirmation !== "delete my account") {
      return error("Type “delete my account” to confirm.", 400);
    }

    if (user.clerkId && process.env.CLERK_SECRET_KEY) {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      try {
        await clerk.users.deleteUser(user.clerkId);
      } catch (err) {
        console.error("Clerk account was not deleted:", err);
        return serverError(
          "The sign-in account was not deleted, so the Elf Match record was left in place. Try again, or contact hello@elfmatch.com."
        );
      }
    }

    const forgotten = await forgetAccount(user.id);
    if (!forgotten.ok) return error(forgotten.message, forgotten.status);

    return success({ deleted: true });
  } catch (err) {
    console.error("Error deleting account:", err);
    return serverError("Failed to delete the account");
  }
}

export const deleteAccount = wrapHandler(_deleteAccount, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});
