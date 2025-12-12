import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Get encryption key from environment or derive from secret
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is required");
  }

  // Use a fixed salt for key derivation (stored separately or derived from secret)
  // In production, you might want to store this salt securely
  const salt = process.env.ENCRYPTION_SALT || "secret-santa-salt-v1";
  return scryptSync(secret, salt, 32);
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
    throw new Error("ENCRYPTION_SECRET or JWT_SECRET environment variable is required");
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

// Fields that should be encrypted in other tables (for future use)
export const ENCRYPTED_USER_FIELDS = [] as const; // Email is needed for lookups, so we don't encrypt it

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
  }
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
  }
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

