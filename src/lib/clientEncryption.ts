export async function encryptForLogin(data: Record<string, string>) {
  const res = await fetch('/api/auth/public-key', { cache: 'no-store' });
  const body = await res.json();
  if (!body.publicKey) throw new Error('Missing public key');
  const key = await importRsaPublicKey(body.publicKey);
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
  return arrayBufferToBase64(encrypted);
}

async function importRsaPublicKey(pem: string) {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('spki', binary, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}
