import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || "0000000000000000000000000000000000000000000000000000000000000000", "hex");

/**
 * Encrypts a string using AES-256-GCM.
 * Format: iv:authTag:encryptedContent
 */
export function encrypt(text: string): string {
  if (!text) return "";
  if (KEY.length !== 32) return text; // Security fallback
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
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
  if (KEY.length !== 32) return hash;
  
  try {
    const [ivHex, authTagHex, encryptedHex] = hash.split(":");
    if (!ivHex || !authTagHex || !encryptedHex) return hash;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption Error:", error);
    return "[DECRYPTION_ERROR]";
  }
}
