import { createClerkClient, verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db, users } from "../db/index.js";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerk = createClerkClient({
  secretKey: clerkSecretKey,
});

type SessionClaims = { sub?: string };

function authorizedParties(): string[] | undefined {
  const raw = process.env.FRONTEND_URL;
  if (!raw) return undefined;
  const parties = new Set<string>();
  for (const entry of raw.split(",")) {
    const value = entry.trim().replace(/\/$/, "");
    if (!value) continue;
    parties.add(value);
    try {
      parties.add(new URL(value).host);
    } catch {
      parties.add(value);
    }
  }
  return parties.size > 0 ? [...parties] : undefined;
}

async function verifySessionToken(token: string): Promise<SessionClaims> {
  const parties = authorizedParties();
  return verifyToken(token, {
    secretKey: clerkSecretKey,
    // Session tokens last about a minute. A few minutes of clock skew
    // should not turn a valid Clerk session into a 401.
    clockSkewInMs: 5 * 60 * 1000,
    ...(parties && { authorizedParties: parties }),
  });
}

export async function getUserFromRequest(req: Request) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifySessionToken(token);
    const clerkId = payload.sub;

    if (!clerkId) {
      return null;
    }

    let user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      const clerkUser = await clerk.users.getUser(clerkId);
      const email = (
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ||
        clerkUser.emailAddresses[0]?.emailAddress ||
        ""
      ).toLowerCase();
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        email.split("@")[0];

      // Accounts created before Clerk have the same email and no clerk_id.
      // Inserting again violates users.email and the handler turns that into 401.
      const existing = email
        ? await db.query.users.findFirst({
            where: eq(users.email, email),
          })
        : null;

      if (existing) {
        const [linked] = await db
          .update(users)
          .set({
            clerkId,
            name: existing.name || name,
            avatarUrl: existing.avatarUrl || clerkUser.imageUrl || null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning();
        user = linked;
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            clerkId,
            email,
            name,
            avatarUrl: clerkUser.imageUrl || null,
          })
          .returning();
        user = newUser;
      }
    }

    return user || null;
  } catch (err) {
    const reason =
      err && typeof err === "object" && "reason" in err
        ? String((err as { reason?: unknown }).reason)
        : "";
    console.error(
      "Clerk session verification failed:",
      reason || (err instanceof Error ? err.message : err)
    );
    return null;
  }
}
