import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiSession } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { createMemberCardPdfBuffer } from '@/lib/card-generator';
import { getCardRenderSettings } from '@/lib/settings';
import { getRequestPublicOrigin } from '@/lib/public-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return NextResponse.json({ ok: false, message: 'غير مصرح' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, cardNumber: true, isVip: true, membershipClass: true, validUntil: true } });
  if (!user) return NextResponse.json({ ok: false, message: 'غير موجود' }, { status: 404 });
  await writeAuditLog(request, 'ADMIN_VIEW_USER_CARD_PDF', { adminId: admin.sub, userId: user.id });
  const layout = await getCardRenderSettings();
  const buffer = await createMemberCardPdfBuffer(user.cardNumber, { isVip: user.isVip, membershipClass: user.membershipClass, validUntil: user.validUntil, layout, publicOrigin: getRequestPublicOrigin(request) });
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="rg-card-${user.cardNumber}.pdf"`, 'Cache-Control': 'no-store' } });
}
