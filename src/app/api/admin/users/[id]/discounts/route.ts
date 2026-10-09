import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { detectSuspiciousText, safeInt, safeString } from '@/lib/security';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const data = await prisma.userPlaceDiscount.findMany({
    where: { userId: params.id },
    include: { place: { select: { id: true, name: true, discount: true } } },
    orderBy: { id: 'desc' }
  });
  return json({ ok: true, data });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const body = await request.json().catch(() => ({}));
  if (detectSuspiciousText(body)) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', { adminId: admin.sub }, { target: 'user_custom_discount' });
    return json({ ok: false, message: 'تم رفض الطلب لوجود مدخلات مشبوهة' }, 403);
  }
  const placeId = safeInt(body.placeId);
  const discountText = safeString(body.discountText, 80);
  if (!placeId || !discountText) return badRequest('اختار المكان واكتب الخصم الخاص');

  const data = await prisma.userPlaceDiscount.upsert({
    where: { userId_placeId: { userId: params.id, placeId } },
    update: { discountText },
    create: { userId: params.id, placeId, discountText }
  });
  await writeAuditLog(request, 'ADMIN_SET_USER_CUSTOM_DISCOUNT', { adminId: admin.sub }, { userId: params.id, placeId, discountText });
  return json({ ok: true, data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const placeId = safeInt(request.nextUrl.searchParams.get('placeId'));
  if (!placeId) return badRequest('placeId مطلوب');
  await prisma.userPlaceDiscount.delete({ where: { userId_placeId: { userId: params.id, placeId } } }).catch(() => null);
  await writeAuditLog(request, 'ADMIN_DELETE_USER_CUSTOM_DISCOUNT', { adminId: admin.sub }, { userId: params.id, placeId });
  return json({ ok: true });
}
