import crypto from 'crypto';

function baseSecret() {
  return process.env.DATA_ENCRYPTION_SECRET || process.env.AUTH_SECRET || 'dev-secret-change-me';
}

function key() {
  return crypto.createHash('sha256').update(baseSecret()).digest();
}

export function hashLookup(value: string) {
  return crypto.createHmac('sha256', key()).update(String(value).trim().toLowerCase()).digest('hex');
}

export function encryptValue(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptValue(value?: string | null) {
  if (!value) return '';
  try {
    const raw = Buffer.from(value, 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

export function maskCard(value?: string | null) {
  const v = String(value || '');
  if (v.length <= 4) return '****';
  return `${v.slice(0, 2)}****${v.slice(-2)}`;
}
