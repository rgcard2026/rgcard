import crypto from 'crypto';

type KeyPair = { publicKey: string; privateKey: string };
const globalForKeys = globalThis as unknown as { __rgLoginKeys?: KeyPair };

function getKeys(): KeyPair {
  if (!globalForKeys.__rgLoginKeys) {
    globalForKeys.__rgLoginKeys = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
  }
  return globalForKeys.__rgLoginKeys;
}

export const LOGIN_PUBLIC_KEY = getKeys().publicKey;

export function decryptLoginPayload(payload: string) {
  const decrypted = crypto.privateDecrypt(
    { key: getKeys().privateKey, oaepHash: 'sha256' },
    Buffer.from(payload, 'base64')
  );
  return JSON.parse(decrypted.toString('utf8')) as Record<string, string>;
}
