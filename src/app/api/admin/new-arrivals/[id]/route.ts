import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { detectSuspiciousText, safeInt, safeString } from '@/lib/security';
import { normalizeArrivalTargetUrl } from '@/lib/new-arrivals';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

async function canManage(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return null;
  if (!(await adminHasPermission(session, 'PLACES' as any))) return 'forbidden' as const;
  return session;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await canManage(request);
  if (!session) return unauthorized();
  if (session === 'forbidden') return json({ ok: false, message: 'ليست لديك صلاحية إدارة البانر' }, 403);
  const id = safeInt(params.id);
  if (!id) return json({ ok: false, message: 'العنصر غير موجود' }, 404);

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = safeString(body.title, 120);
    if (!title || detectSuspiciousText({ title })) return json({ ok: false, message: 'اسم العنصر غير صالح' }, 400);
    update.title = title;
  }
  if (body.targetUrl !== undefined) {
    const targetUrl = normalizeArrivalTargetUrl(body.targetUrl);
    if (!targetUrl) return json({ ok: false, message: 'الرابط غير صالح. استخدم https:// فقط' }, 400);
    update.targetUrl = targetUrl;
  }
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
  if (!Object.keys(update).length) return json({ ok: false, message: 'لا توجد تغييرات للحفظ' }, 400);

  const data = await prisma.newArrival.update({ where: { id }, data: update as any });
  await writeAuditLog(request, 'ADMIN_UPDATE_NEW_ARRIVAL', { adminId: session.sub }, { newArrivalId: id, fields: Object.keys(update) });
  return json({ ok: true, data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await canManage(request);
  if (!session) return unauthorized();
  if (session === 'forbidden') return json({ ok: false, message: 'ليست لديك صلاحية إدارة البانر' }, 403);
  const id = safeInt(params.id);
  if (!id) return json({ ok: false, message: 'العنصر غير موجود' }, 404);

  await prisma.newArrival.delete({ where: { id } });
  await writeAuditLog(request, 'ADMIN_DELETE_NEW_ARRIVAL', { adminId: session.sub }, { newArrivalId: id });
  return json({ ok: true });
}
