import type { NextRequest } from 'next/server';

// Current Railway public domain. Keep RG_CARD_PUBLIC_URL in Railway Variables so
// a future custom domain can override this safely without code changes.
const DEFAULT_PUBLIC_ORIGIN = 'https://rg-card-web-production-9ece.up.railway.app';

function normalizeOrigin(value?: string | null) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';

  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (!host || host === '0.0.0.0' || host === '127.0.0.1' || host === 'localhost' || host === '::1') return '';
    return url.origin;
  } catch {
    return '';
  }
}

function firstHeaderValue(value?: string | null) {
  return String(value || '').split(',')[0]?.trim() || '';
}

export function getConfiguredPublicOrigin() {
  return normalizeOrigin(
    process.env.RG_CARD_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.RAILWAY_PUBLIC_URL ||
    DEFAULT_PUBLIC_ORIGIN
  );
}

/**
 * Resolves a browser-safe public origin for QR codes and generated card PDFs.
 * Railway may expose the internal container host (0.0.0.0:8080) to Next.js,
 * which must never be embedded in a QR payload.
 */
export function getRequestPublicOrigin(request: NextRequest) {
  const configured = getConfiguredPublicOrigin();
  if (configured) return configured;

  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const host = forwardedHost || firstHeaderValue(request.headers.get('host'));
  const proto = firstHeaderValue(request.headers.get('x-forwarded-proto')) || 'https';
  const forwarded = normalizeOrigin(host ? `${proto}://${host}` : '');
  if (forwarded) return forwarded;

  return normalizeOrigin(request.nextUrl.origin) || DEFAULT_PUBLIC_ORIGIN;
}
