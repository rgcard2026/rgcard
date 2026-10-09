import { prisma } from './prisma';

const STANDALONE_READY_MARKER = 'newArrivalsStandaloneV29';

export function normalizeArrivalTargetUrl(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;

    const host = url.hostname.toLowerCase();
    const privateIpv4 = /^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
    if (
      host === 'localhost' ||
      host === '::1' ||
      host.endsWith('.local') ||
      privateIpv4.test(host)
    ) return null;

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Marks the standalone feature as initialized. No existing Place/Offer records
 * are copied: New Arrival is intentionally independent from the offers catalog.
 */
export async function ensureStandaloneNewArrivals() {
  await prisma.appSetting.upsert({
    where: { key: STANDALONE_READY_MARKER },
    update: { value: 'true' },
    create: { key: STANDALONE_READY_MARKER, value: 'true' }
  }).catch(() => null);
}
