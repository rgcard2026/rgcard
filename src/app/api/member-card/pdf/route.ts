import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { createMemberCardPdfBuffer } from '@/lib/card-generator';
import { getCardRenderSettings } from '@/lib/settings';
import { getRequestPublicOrigin } from '@/lib/public-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request, 'user');
  if (!session) return NextResponse.json({ ok: false, message: 'غير مصرح أو انتهت الجلسة' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { cardNumber: true, isVip: true, membershipClass: true, validUntil: true } });
  if (!user) return NextResponse.json({ ok: false, message: 'غير موجود' }, { status: 404 });
  await writeAuditLog(request, 'VIEW_MEMBER_CARD_PDF', { userId: session.sub });
  const layout = await getCardRenderSettings();
  const buffer = await createMemberCardPdfBuffer(user.cardNumber, { isVip: user.isVip, membershipClass: user.membershipClass, validUntil: user.validUntil, layout, publicOrigin: getRequestPublicOrigin(request) });
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="rg-card.pdf"', 'Cache-Control': 'no-store' } });
}
