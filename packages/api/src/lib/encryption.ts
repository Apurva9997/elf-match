import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

// Get encryption key from environment or derive from secret
let encryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (encryptionKey) return encryptionKey;

  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is required");
  }
  const salt = process.env.ENCRYPTION_SALT;
  if (!salt) {
    throw new Error("ENCRYPTION_SALT environment variable is required");
  }
  // scrypt is intentionally slow. Deriving it on every profile read blows
  // the Netlify function timeout and surfaces as "This function has crashed".
  encryptionKey = scryptSync(secret, salt, 32);
  return encryptionKey;
}

/**
 * Encrypts a string value
 * Returns format: iv:authTag:encryptedData (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Combine IV, auth tag, and encrypted data
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypts an encrypted string
 * Expects format: iv:authTag:encryptedData (all base64 encoded)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;

  // Check if the data is encrypted (contains our format)
  if (!encryptedData.includes(":")) {
    // Data is not encrypted, return as-is (for backwards compatibility)
    return encryptedData;
  }

  const key = getEncryptionKey();

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    // Invalid format, return as-is
    return encryptedData;
  }

  const [ivBase64, authTagBase64, encrypted] = parts;

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypts an object's specified fields
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result[field] as unknown) = encrypt(value);
    }
  }

  return result;
}

/**
 * Decrypts an object's specified fields
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result[field] as unknown) = decrypt(value);
    }
  }

  return result;
}

/**
 * Hash a value for searching (one-way, deterministic)
 * Used for email lookups without exposing the actual email
 */
export function hashForSearch(value: string): string {
  if (!value) return value;

  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is required");
  }

  // Use scrypt for deterministic hashing
  const hash = scryptSync(value.toLowerCase(), secret, 32);
  return hash.toString("base64");
}

/**
 * Hash a token for secure storage (one-way)
 * The original token is sent to the user, but we store the hash
 */
export function hashToken(token: string): string {
  if (!token) return token;

  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET or JWT_SECRET environment variable is required"
    );
  }

  // Use scrypt for secure hashing
  const hash = scryptSync(token, secret, 32);
  return hash.toString("base64");
}

// Fields that should be encrypted in the addresses table
export const ENCRYPTED_ADDRESS_FIELDS = [
  "streetLine1",
  "streetLine2",
  "city",
  "state",
  "postalCode",
] as const;

export const ENCRYPTED_USER_FIELDS = ["mobile"] as const; // Email is needed for lookups, so we don't encrypt it

export function encryptMobile(
  mobile: string | null | undefined
): string | null {
  if (!mobile) return null;
  return encrypt(mobile);
}

export function decryptMobile(
  encryptedMobile: string | null | undefined
): string | null {
  if (!encryptedMobile) return null;
  return decrypt(encryptedMobile);
}

/**
 * A wishlist is sealed to the membership that wrote it, and to a blind
 * kept outside the database.
 * ENCRYPTION_SECRET and ENCRYPTION_SALT derive the blind. They are not the
 * opening key. The opening key also takes the membership id, which a
 * database copy contains, and WISHLIST_SEAL_KEY, which it does not.
 * A person who has the database, the salt, and the encryption secret still
 * cannot read the list. The application opens it only while serving the
 * writer, or the assigned giver after the draw.
 */
function wishlistKey(teamMemberId: string): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  const salt = process.env.ENCRYPTION_SALT;
  const seal = process.env.WISHLIST_SEAL_KEY;
  if (!secret || !salt || !seal) {
    throw new Error(
      "ENCRYPTION_SECRET, ENCRYPTION_SALT, and WISHLIST_SEAL_KEY are required"
    );
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
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(seal, "utf8"),
      blind,
      Buffer.from(`elfmatch-wishlist-v1:${teamMemberId}`, "utf8"),
      32
    )
  );
}

function sealWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function openWithKey(sealed: string, key: Buffer): string {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Wishlist text is not sealed");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const authTag = Buffer.from(parts[2], "base64url");
  const encrypted = Buffer.from(parts[3], "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}

export function sealWishlistText(
  value: string | null | undefined,
  teamMemberId: string
): string | null {
  if (!value) return null;
  return sealWithKey(value, wishlistKey(teamMemberId));
}

export function openWishlistText(
  value: string | null | undefined,
  teamMemberId: string
): string | null {
  if (!value) return null;
  // Rows written before sealing have no v1 prefix. They are still readable
  // until the writer saves again, which replaces them with sealed text.
  if (!value.startsWith("v1.")) return value;
  return openWithKey(value, wishlistKey(teamMemberId));
}

/**
 * Encrypts address data before storing
 */
export function encryptAddress<
  T extends {
    streetLine1?: string | null;
    streetLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  },
>(address: T): T {
  const result = { ...address };

  if (result.streetLine1) result.streetLine1 = encrypt(result.streetLine1);
  if (result.streetLine2) result.streetLine2 = encrypt(result.streetLine2);
  if (result.city) result.city = encrypt(result.city);
  if (result.state) result.state = encrypt(result.state);
  if (result.postalCode) result.postalCode = encrypt(result.postalCode);

  return result;
}

/**
 * Decrypts address data after retrieving
 */
export function decryptAddress<
  T extends {
    streetLine1?: string | null;
    streetLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  },
>(address: T | null | undefined): T | null | undefined {
  if (!address) return address;

  const result = { ...address };

  if (result.streetLine1) result.streetLine1 = decrypt(result.streetLine1);
  if (result.streetLine2) result.streetLine2 = decrypt(result.streetLine2);
  if (result.city) result.city = decrypt(result.city);
  if (result.state) result.state = decrypt(result.state);
  if (result.postalCode) result.postalCode = decrypt(result.postalCode);

  return result;
}
