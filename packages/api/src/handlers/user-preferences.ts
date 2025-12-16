import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "../db/index.js";
import { getUserFromEvent } from "../lib/auth.js";
import {
  success,
  error,
  unauthorized,
  serverError,
} from "../lib/response.js";

const updatePreferencesSchema = z.object({
  onboarding: z
    .object({
      new_user: z.boolean().optional(),
      admin: z.boolean().optional(),
      member: z.boolean().optional(),
    })
    .optional(),
});

export async function getUserPreferences(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);

    if (!user) {
      return unauthorized();
    }

    const userData = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        preferences: true,
      },
    });

    return success({
      preferences: userData?.preferences || {},
    });
  } catch (err) {
    console.error("Error getting user preferences:", err);
    return serverError("Failed to get user preferences");
  }
}

export async function updateUserPreferences(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);

    if (!user) {
      return unauthorized();
    }

    const body = JSON.parse(event.body || "{}");
    const parsed = updatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid preferences data", 400, "VALIDATION_ERROR");
    }

    // Get current preferences
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        preferences: true,
      },
    });

    const currentPreferences = currentUser?.preferences || {};

    // Merge new preferences with existing ones
    const updatedPreferences = {
      ...currentPreferences,
      ...parsed.data,
      onboarding: {
        ...(currentPreferences.onboarding || {}),
        ...(parsed.data.onboarding || {}),
      },
    };

    // Update user preferences
    const [updatedUser] = await db
      .update(users)
      .set({
        preferences: updatedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return success({
      preferences: updatedUser.preferences || {},
    });
  } catch (err) {
    console.error("Error updating user preferences:", err);
    return serverError("Failed to update user preferences");
  }
}

