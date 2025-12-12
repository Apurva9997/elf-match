import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, teamMembers, addresses, assignments } from "../db/index.js";
import { getUserFromEvent } from "../lib/auth.js";
import {
  success,
  error,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "../lib/response.js";
import { encryptAddress, decryptAddress } from "../lib/encryption.js";

const addressSchema = z.object({
  streetLine1: z.string().min(1).max(255),
  streetLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
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

export async function getAddress(
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

    const address = await db.query.addresses.findFirst({
      where: eq(addresses.teamMemberId, membership.id),
    });

    // Decrypt address data before returning
    const decryptedAddress = decryptAddress(address);

    return success(decryptedAddress || null);
  } catch (err) {
    console.error("Error getting address:", err);
    return serverError("Failed to get address");
  }
}

export async function updateAddress(
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
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid address data", 400, "VALIDATION_ERROR");
    }

    const { streetLine1, streetLine2, city, state, postalCode, country } =
      parsed.data;

    // Encrypt sensitive address fields before storing
    const encryptedData = encryptAddress({
      streetLine1,
      streetLine2: streetLine2 || null,
      city,
      state: state || null,
      postalCode,
    });

    // Check if address exists
    const existingAddress = await db.query.addresses.findFirst({
      where: eq(addresses.teamMemberId, membership.id),
    });

    let address;
    if (existingAddress) {
      // Update existing
      const [updated] = await db
        .update(addresses)
        .set({
          streetLine1: encryptedData.streetLine1!,
          streetLine2: encryptedData.streetLine2,
          city: encryptedData.city!,
          state: encryptedData.state,
          postalCode: encryptedData.postalCode!,
          country, // Country is not encrypted (needed for shipping logistics)
          updatedAt: new Date(),
        })
        .where(eq(addresses.id, existingAddress.id))
        .returning();
      address = updated;
    } else {
      // Create new
      const [created] = await db
        .insert(addresses)
        .values({
          teamMemberId: membership.id,
          streetLine1: encryptedData.streetLine1!,
          streetLine2: encryptedData.streetLine2,
          city: encryptedData.city!,
          state: encryptedData.state,
          postalCode: encryptedData.postalCode!,
          country, // Country is not encrypted
        })
        .returning();
      address = created;
    }

    // Decrypt before returning to client
    const decryptedAddress = decryptAddress(address);

    return success(decryptedAddress);
  } catch (err) {
    console.error("Error updating address:", err);
    return serverError("Failed to update address");
  }
}

export async function getGifteeAddress(
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
              },
            },
            address: true,
          },
        },
      },
    });

    if (!assignment) {
      return notFound(
        "No assignment found. Assignments may not have been made yet."
      );
    }

    if (!assignment.receiver.address) {
      return success({
        giftee: {
          name: assignment.receiver.user?.name || "Unknown",
        },
        address: null,
        message: "Your giftee has not added their address yet.",
      });
    }

    // Decrypt the giftee's address before returning
    const decryptedAddress = decryptAddress(assignment.receiver.address);

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
