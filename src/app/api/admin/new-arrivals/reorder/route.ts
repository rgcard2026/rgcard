import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function uniqueIds(raw: unknown) {
  if (!Array.isArray(raw)) return [] as number[];
  const seen = new Set<number>();
  for (const value of raw) {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) seen.add(id);
  }
  return Array.from(seen);
}

export async function PATCH(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  if (!(await adminHasPermission(session, 'NEW_ARRIVALS'))) return json({ ok: false, message: 'ليست لديك صلاحية إدارة البانر' }, 403);

  const body = await request.json().catch(() => ({}));
  const ids = uniqueIds(body?.ids);
  const all = await prisma.newArrival.findMany({ select: { id: true } });

  if (ids.length !== all.length || ids.some((id) => !all.some((item) => item.id === id))) {
    return json({ ok: false, message: 'تعذر حفظ الترتيب؛ أعد تحميل الصفحة وحاول مرة أخرى' }, 400);
  }

  await prisma.$transaction(ids.map((id, index) => prisma.newArrival.update({ where: { id }, data: { sortOrder: index + 1 } })));
  const data = await prisma.newArrival.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  await writeAuditLog(request, 'ADMIN_REORDER_NEW_ARRIVALS', { adminId: session.sub }, { ids });
  return json({ ok: true, data });
}
