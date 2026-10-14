import { NextRequest } from 'next/server';
import { json } from '@/lib/api';
import { getRequestSession } from '@/lib/session';
import { getSettingMap } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request, 'user');
  if (!session) return json({ ok: true, popup: null });

  const map = await getSettingMap();
  const enabled = ['1', 'true', 'yes', 'on'].includes(String(map.designPopupEnabled || '').toLowerCase());
  const title = String(map.designPopupTitle || '').trim();
  const text = String(map.designPopupText || '').trim();
  const imageUrl = String(map.designPopupImageUrl || '').startsWith('/uploads/design-popup/') ? String(map.designPopupImageUrl) : '';
  const linkUrl = String(map.designPopupLinkUrl || '').trim();

  if (!enabled || (!title && !text && !imageUrl)) return json({ ok: true, popup: null });

  // Audience targeting (checked server-side so the targeted list is never public).
  const audience = ['all', 'selected'].includes(String(map.designPopupAudience || '')) ? String(map.designPopupAudience) : 'all';
  if (audience === 'selected') {
    const targets = new Set(
      String(map.designPopupUserIds || '')
        .split(/[\s,;\n]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    );
    if (targets.size === 0) return json({ ok: true, popup: null });
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { cardNumber: true, idNumber: true } });
    const cardNumber = String(user?.cardNumber || '').trim();
    const idNumber = String(user?.idNumber || '').trim();
    if (!targets.has(cardNumber) && !(idNumber && targets.has(idNumber))) {
      return json({ ok: true, popup: null });
    }
  }

  const response = json({ ok: true, popup: { title, text, imageUrl, linkUrl } });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
