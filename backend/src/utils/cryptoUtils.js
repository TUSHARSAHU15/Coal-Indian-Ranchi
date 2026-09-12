const crypto = require('crypto');

// 32-byte key from environment or default for development
const getEncryptionKey = () => {
  const keyHex = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  return Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
};

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns string format: iv:authTag:encryptedData (all in hex)
 */
const encryptPII = (text) => {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Failed to encrypt sensitive data');
  }
};

/**
 * Decrypt ciphertext using AES-256-GCM
 */
const decryptPII = (encryptedPayload) => {
  if (!encryptedPayload) return encryptedPayload;
  // If not in encrypted format (e.g. legacy plain text), return as is
  if (!encryptedPayload.includes(':')) return encryptedPayload;

  try {
    const [ivHex, authTagHex, encryptedText] = encryptedPayload.split(':');
    if (!ivHex || !authTagHex || !encryptedText) return encryptedPayload;

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return '[ENCRYPTED_PII]';
  }
};

/**
 * Generate deterministic SHA-256 hash for duplicate detection
 */
const hashGovtId = (idNumber) => {
  if (!idNumber) return null;
  const cleanId = String(idNumber).trim().toUpperCase();
  return crypto.createHash('sha256').update(cleanId).digest('hex');
};

/**
 * Generate cryptographically secure 6-digit numeric pass code
 */
const generatePassCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Generate cryptographically secure random token (64 hex characters)
 */
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Pure Node.js RFC 6238 TOTP generator (Time-based One-Time Password)
 */
const generateTOTP = (secret, timeStep = 30) => {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(buffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
};

/**
 * Validate TOTP code with 1-step clock skew tolerance (+/- 30s)
 */
const verifyTOTP = (token, secret, timeStep = 30) => {
  if (!token || !secret) return false;
  const cleanToken = String(token).trim();

  const epoch = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(epoch / timeStep);

  // Check current, previous, and next step to tolerate slight clock drift
  for (let offset = -1; offset <= 1; offset++) {
    const counter = currentStep + offset;
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(buffer);
    const digest = hmac.digest();

    const byteOffset = digest[digest.length - 1] & 0xf;
    const code =
      ((digest[byteOffset] & 0x7f) << 24) |
      ((digest[byteOffset + 1] & 0xff) << 16) |
      ((digest[byteOffset + 2] & 0xff) << 8) |
      (digest[byteOffset + 3] & 0xff);

    const generated = (code % 1000000).toString().padStart(6, '0');
    if (generated === cleanToken) return true;
  }
  return false;
};

module.exports = {
  encryptPII,
  decryptPII,
  hashGovtId,
  generatePassCode,
  generateSecureToken,
  generateTOTP,
  verifyTOTP
};
