import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

/**
 * AES-256-GCM authenticated encryption for Facebook Page access tokens.
 * Key: TOKEN_ENCRYPTION_KEY env var — a base64 or hex string of >= 32 bytes,
 * or any passphrase (derived with scrypt + a fixed salt label). The key
 * itself is never stored in the database or sent to the client.
 * Format: base64(iv 12B || authTag 16B || ciphertext).
 */
function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('Missing TOKEN_ENCRYPTION_KEY');
  // Accept base64 / hex encoded 32-byte keys, otherwise derive via scrypt.
  try {
    const b64 = Buffer.from(raw, 'base64');
    if (b64.length === 32) return b64;
  } catch { /* fall through */ }
  try {
    const hex = Buffer.from(raw, 'hex');
    if (hex.length === 32) return hex;
  } catch { /* fall through */ }
  return scryptSync(raw, 'montu-tech-token-encryption', 32);
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptToken(encrypted: string): string {
  const key = getKey();
  const buf = Buffer.from(encrypted, 'base64');
  if (buf.length < 28) throw new Error('Invalid encrypted token format');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
