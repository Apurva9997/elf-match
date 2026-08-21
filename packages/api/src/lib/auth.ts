import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db, users } from "../db/index.js";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function getUserFromRequest(req: Request) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = await clerk.verifyToken(token);
    const clerkId = payload.sub;

    let user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      const clerkUser = await clerk.users.getUser(clerkId);
      const email =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ||
        clerkUser.emailAddresses[0]?.emailAddress ||
        "";
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        email.split("@")[0];

      const [newUser] = await db
        .insert(users)
        .values({
          clerkId,
          email: email.toLowerCase(),
          name,
          avatarUrl: clerkUser.imageUrl || null,
        })
        .returning();
      user = newUser;
    }

    return user || null;
  } catch {
    return null;
  }
}
