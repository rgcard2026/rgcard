import type { NextRequest } from 'next/server';

const suspiciousPatterns: RegExp[] = [
  /\.\.(?:\\|\/|%2f|%5c)/i,
  /%2e%2e/i,
  /(?:^|[\s'"`])(or|and)\s+['"`]?\d+['"`]?\s*=\s*['"`]?\d+/i,
  /union\s+(all\s+)?select/i,
  /information_schema|@@version|sysobjects|xp_cmdshell/i,
  /sleep\s*\(|benchmark\s*\(|waitfor\s+delay/i,
  /<\s*script|javascript:|onerror\s*=|onload\s*=/i,
  /(?:file|php|data|expect|zip):\/\//i,
  /\/etc\/passwd|boot\.ini|win\.ini/i,
  /\b(select|insert|delete|update|drop|alter|truncate)\b[\s\S]{0,40}\b(from|table|where|into)\b/i,
  /\$where|\$ne|\$gt|\$regex/i
];

export function detectSuspiciousText(input: unknown) {
  const text = typeof input === 'string' ? input : JSON.stringify(input ?? '');
  if (!text) return null;
  const decoded = safeDecode(text);
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(decoded)) return pattern.toString();
  }
  return null;
}

export function detectSuspiciousRequest(request: NextRequest) {
  const target = `${request.nextUrl.pathname}?${request.nextUrl.searchParams.toString()}`;
  return detectSuspiciousText(target);
}

export function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function safeString(value: unknown, max = 250) {
  return String(value ?? '').trim().slice(0, max);
}

export function safePublicAssetUrl(value: unknown) {
  const raw = safeString(value, 220000);
  if (!raw) return null;
  if (raw.startsWith('/logos/') || raw.startsWith('/uploads/') || raw.startsWith('/rg-card-template-logos/')) return raw;
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(raw) && raw.length < 220000) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeInt(value: unknown) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
