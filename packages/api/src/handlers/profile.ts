import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, userAddresses, users } from "../db/index.js";
import { getUserFromEvent } from "../lib/auth.js";
import { decryptAddress, encryptAddress } from "../lib/encryption.js";
import { error, serverError, success, unauthorized } from "../lib/response.js";

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  mobile: z.string().max(20).optional().nullable(),
  address: z
    .object({
      streetLine1: z.string().min(1).max(255),
      streetLine2: z.string().max(255).optional(),
      city: z.string().min(1).max(100),
      state: z.string().max(100).optional(),
      postalCode: z.string().min(1).max(20),
      country: z.string().min(1).max(100),
    })
    .optional(),
});

export async function getProfile(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    // Get user with address
    const userWithAddress = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        address: true,
      },
    });

    if (!userWithAddress) {
      return unauthorized("User not found");
    }

    // Decrypt address data before returning
    const decryptedAddress = decryptAddress(userWithAddress.address);

    return success({
      id: userWithAddress.id,
      email: userWithAddress.email,
      name: userWithAddress.name,
      mobile: userWithAddress.mobile,
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

export async function updateProfile(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const body = JSON.parse(event.body || "{}");
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid profile data", 400, "VALIDATION_ERROR");
    }

    const { name, mobile, address } = parsed.data;

    // Update user fields (name and mobile)
    if (name !== undefined || mobile !== undefined) {
      const updateData: {
        name?: string;
        mobile?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };
      if (name !== undefined) updateData.name = name;
      if (mobile !== undefined) updateData.mobile = mobile;

      await db.update(users).set(updateData).where(eq(users.id, user.id));
    }

    // Update or create address if provided
    if (address) {
      const { streetLine1, streetLine2, city, state, postalCode, country } =
        address;

      // Encrypt sensitive address fields before storing
      const encryptedData = encryptAddress({
        streetLine1,
        streetLine2: streetLine2 || null,
        city,
        state: state || null,
        postalCode,
      });

      // Check if address exists
      const existingAddress = await db.query.userAddresses.findFirst({
        where: eq(userAddresses.userId, user.id),
      });

      if (existingAddress) {
        // Update existing
        await db
          .update(userAddresses)
          .set({
            streetLine1: encryptedData.streetLine1!,
            streetLine2: encryptedData.streetLine2,
            city: encryptedData.city!,
            state: encryptedData.state,
            postalCode: encryptedData.postalCode!,
            country, // Country is not encrypted (needed for shipping logistics)
            updatedAt: new Date(),
          })
          .where(eq(userAddresses.id, existingAddress.id));
      } else {
        // Create new
        await db.insert(userAddresses).values({
          userId: user.id,
          streetLine1: encryptedData.streetLine1!,
          streetLine2: encryptedData.streetLine2,
          city: encryptedData.city!,
          state: encryptedData.state,
          postalCode: encryptedData.postalCode!,
          country, // Country is not encrypted
        });
      }
    }

    // Return updated profile
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

    return success({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      mobile: updatedUser.mobile,
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

