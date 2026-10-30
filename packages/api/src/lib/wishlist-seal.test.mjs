import assert from "node:assert/strict";
import test from "node:test";
import { openWishlistText, sealWishlistText } from "./encryption.ts";

process.env.ENCRYPTION_SECRET = "test-secret-not-used-outside-this-file";
process.env.ENCRYPTION_SALT = "test-salt-not-used-outside-this-file";
process.env.WISHLIST_SEAL_KEY = "test-seal-not-used-outside-this-file";

const memberA = "11111111-1111-4111-8111-111111111111";
const memberB = "22222222-2222-4222-8222-222222222222";

test("a sealed wishlist opens for the membership that wrote it", () => {
  const sealed = sealWishlistText("A hardcover notebook", memberA);
  assert.equal(sealed.startsWith("v1."), true);
  assert.equal(sealed.includes("notebook"), false);
  assert.equal(openWishlistText(sealed, memberA), "A hardcover notebook");
});

test("the server secret and salt do not open another membership's wishlist", () => {
  const sealed = sealWishlistText("Stay inside ₹500–₹1,000", memberA);
  assert.throws(() => openWishlistText(sealed, memberB));
});

test("the database, the salt, and the encryption secret cannot open a wishlist", () => {
  const sealed = sealWishlistText("A hardcover notebook", memberA);
  const seal = process.env.WISHLIST_SEAL_KEY;
  delete process.env.WISHLIST_SEAL_KEY;
  try {
    assert.throws(() => openWishlistText(sealed, memberA));
  } finally {
    process.env.WISHLIST_SEAL_KEY = seal;
  }
});

test("a row written before sealing is still readable until it is saved again", () => {
  assert.equal(openWishlistText("A plain old title", memberA), "A plain old title");
});

test("an empty note is stored as nothing to seal", () => {
  assert.equal(sealWishlistText("", memberA), null);
  assert.equal(sealWishlistText(null, memberA), null);
  assert.equal(openWishlistText(null, memberA), null);
});
