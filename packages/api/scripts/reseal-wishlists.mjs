/**
 * Seals wishlist titles, notes, and shop links that are still stored as
 * plain text. A row that already starts with "v1." is left alone.
 *
 * Run on the host, with the production env file, after the title column
 * is text. Prints counts only. Never prints a wishlist.
 *
 *   set -a; . /etc/elfmatch.env; set +a   # fails if values contain shell syntax
 *   node --env-file=/etc/elfmatch.env packages/api/scripts/reseal-wishlists.mjs
 */
const { createCipheriv, hkdfSync, randomBytes } = require("node:crypto");
const pg = require("pg");

function sealWishlistText(value, teamMemberId) {
  if (!value) return null;
  const secret = process.env.ENCRYPTION_SECRET;
  const salt = process.env.ENCRYPTION_SALT;
  const seal = process.env.WISHLIST_SEAL_KEY;
  if (!secret || !salt || !seal) {
    throw new Error("missing seal inputs");
  }
  const blind = Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from(salt, "utf8"),
      Buffer.from("elfmatch-wishlist-blind-v1", "utf8"),
      32
    )
  );
  const key = Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(seal, "utf8"),
      blind,
      Buffer.from(`elfmatch-wishlist-v1:${teamMemberId}`, "utf8"),
      32
    )
  );
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 1,
  });

  const { rows } = await pool.query(
    "select id, wishlist_id, title, description, url from wish_items"
  );

  let sealed = 0;
  let already = 0;

  for (const row of rows) {
    if (typeof row.title === "string" && row.title.startsWith("v1.")) {
      already += 1;
      continue;
    }

    const wishlist = await pool.query(
      "select team_member_id from wishlists where id = $1",
      [row.wishlist_id]
    );
    const teamMemberId = wishlist.rows[0]?.team_member_id;
    if (!teamMemberId) {
      throw new Error("a wish item has no membership");
    }

    await pool.query(
      "update wish_items set title = $2, description = $3, url = $4 where id = $1",
      [
        row.id,
        sealWishlistText(row.title, teamMemberId),
        sealWishlistText(row.description, teamMemberId),
        sealWishlistText(row.url, teamMemberId),
      ]
    );
    sealed += 1;
  }

  const check = await pool.query(
    "select count(*)::int as plain from wish_items where title not like 'v1.%'"
  );

  console.log(
    JSON.stringify({
      sealed,
      already,
      plainRemaining: check.rows[0].plain,
    })
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
