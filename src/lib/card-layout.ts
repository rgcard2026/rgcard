export type CardBoxLayout = { x: number; y: number; width: number; height: number; fontSize: number };
export type CardRenderLayout = {
  width: number;
  height: number;
  templateUrl?: string;
  qr: { x: number; y: number; size: number };
  id: CardBoxLayout;
  membershipClass: CardBoxLayout;
  expiry: CardBoxLayout;
};

export const CARD_TEMPLATE: CardRenderLayout = {
  width: 1573,
  height: 1000,
  templateUrl: '/card-template.png',
  qr: {
    // Default QR placement, centered inside the gold QR frame on the template
    // (frame spans roughly x:1185–1508, y:478–808 on the 1573×1000 artwork).
    // You can override these values from:
    // Admin Dashboard → إعدادات الحساب → Card QR Position
    x: 1196,
    y: 495,
    size: 296
  },
  id: {
    x: 1069,
    y: 850,
    width: 445,
    height: 89,
    fontSize: 34
  },
  membershipClass: {
    x: 64,
    y: 690,
    width: 260,
    height: 64,
    fontSize: 42
  },
  expiry: {
    // Default expiry placement. You can override these values from:
    // Admin Dashboard → إعدادات الحساب → Card Expiry Position
    x: 72,
    y: 870,
    width: 420,
    height: 38,
    fontSize: 22
  }
};

export const MEMBERSHIP_CLASSES = [
  'Regular',
  'Dept 1',
  'Dept 2',
  'Dept 3',
  'Dept 4',
  'Dept 5',
  'Dept 6',
  'Dept 7',
  'Dept 8',
  'Dept 9',
  'Dept 10',
  'VIP'
] as const;

export type MembershipClass = typeof MEMBERSHIP_CLASSES[number];

export function normalizeMembershipClass(value?: string | null, isVip?: boolean): MembershipClass {
  const raw = String(value || '').trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
  if (['vip', 'v.i.p'].includes(normalized) || isVip) return 'VIP';
  const match = normalized.match(/^dept\s*(10|[1-9])$/i) || normalized.match(/^department\s*(10|[1-9])$/i);
  if (match) return `Dept ${match[1]}` as MembershipClass;
  return 'Regular';
}

export function membershipLabel(value?: string | null, isVip?: boolean) {
  const normalized = normalizeMembershipClass(value, isVip);
  return normalized === 'Regular' ? '' : normalized;
}

export function formatCardExpiry(validUntil?: string | Date | null) {
  if (!validUntil) return '';
  const d = validUntil instanceof Date ? validUntil : new Date(validUntil);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `EXP. ${yyyy}/${mm}/${dd}`;
}

export function cardQrPayload(cardNumber: string, publicOrigin?: string) {
  const configuredOrigin = String(
    process.env.RG_CARD_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    publicOrigin ||
    'https://rg-card-web-production-9ece.up.railway.app'
  ).trim().replace(/\/+$/, '');
  // QR opens the login page with the card number already filled. Password is still required.
  if (configuredOrigin) return `${configuredOrigin}/login?card=${encodeURIComponent(cardNumber)}`;
  return `RG-CARD:${cardNumber}`;
}
