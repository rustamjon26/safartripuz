import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function resolveEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }

  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }

  return key;
}

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (!cachedKey) {
    cachedKey = resolveEncryptionKey();
  }
  return cachedKey;
}

/**
 * Encrypts a string using AES-256-GCM.
 * Format: iv:authTag:encryptedContent
 */
export function encrypt(text: string): string {
  if (!text) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string previously encrypted with encrypt().
 */
export function decrypt(hash: string): string {
  if (!hash || !hash.includes(":")) return hash;

  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encryptedHex] = hash.split(":");
    if (!ivHex || !authTagHex || !encryptedHex) return hash;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption Error:", error);
    return "[DECRYPTION_ERROR]";
  }
}
