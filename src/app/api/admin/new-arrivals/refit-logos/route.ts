import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { uploadsRoot } from '@/lib/uploads';
import { writeAuditLog } from '@/lib/audit';
import { autoFitLogo } from '@/lib/logo-fit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  if (!(await adminHasPermission(session, 'NEW_ARRIVALS'))) {
    return json({ ok: false, message: 'ليست لديك صلاحية إدارة البانر' }, 403);
  }

  const items = await prisma.newArrival.findMany({ where: { logoUrl: { startsWith: '/uploads/new-arrivals/' } }, select: { id: true, logoUrl: true } });
  let refitted = 0;
  for (const item of items) {
    try {
      const relative = item.logoUrl.replace(/^\/uploads\//, '');
      const original = await readFile(path.join(uploadsRoot(), relative));
      const fitted = await autoFitLogo(original);
      if (!fitted) continue;
      const filename = `${item.id}-${Date.now()}.png`;
      await writeFile(path.join(uploadsRoot(), 'new-arrivals', filename), fitted);
      await prisma.newArrival.update({ where: { id: item.id }, data: { logoUrl: `/uploads/new-arrivals/${filename}` } });
      refitted += 1;
    } catch {
      // skip a logo we cannot read or process
    }
  }

  await writeAuditLog(request, 'ADMIN_REFIT_NEW_ARRIVAL_LOGOS', { adminId: session.sub }, { total: items.length, refitted });
  return json({ ok: true, refitted, total: items.length, message: `تم تحسين ${refitted} من ${items.length} لوجو.` });
}
