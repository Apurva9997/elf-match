import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "../db/index.js";
import { getUserFromRequest } from "../lib/auth.js";
import { error, serverError, success, unauthorized } from "../lib/response.js";
import { type RouteParams, wrapHandler } from "../lib/middleware.js";
import { rateLimiters } from "../lib/rate-limit.js";

const updatePreferencesSchema = z.object({
  onboarding: z
    .object({
      new_user: z.boolean().optional(),
      admin: z.boolean().optional(),
      member: z.boolean().optional(),
    })
    .optional(),
});

async function _getUserPreferences(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);

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

async function _updateUserPreferences(
  req: Request,
  _params: RouteParams
): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return unauthorized();
    }

    const body = JSON.parse(await req.text() || "{}");
    const parsed = updatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid preferences data", 400, "VALIDATION_ERROR");
    }

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        preferences: true,
      },
    });

    const currentPreferences = currentUser?.preferences || {};

    const updatedPreferences = {
      ...currentPreferences,
      ...parsed.data,
      onboarding: {
        ...(currentPreferences.onboarding || {}),
        ...(parsed.data.onboarding || {}),
      },
    };

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

export const getUserPreferences = wrapHandler(_getUserPreferences, {
  limiter: rateLimiters.authenticatedRead,
  useUserId: true,
});

export const updateUserPreferences = wrapHandler(_updateUserPreferences, {
  limiter: rateLimiters.authenticatedWrite,
  useUserId: true,
});
