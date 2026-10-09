import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { safeString } from '@/lib/security';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  const requester = await prisma.admin.findUnique({ where: { id: session.sub } });
  if (requester?.role !== 'OWNER' && requester?.permissions !== 'ALL' && !requester?.permissions.includes('ADMINS')) return json({ ok: false, message: 'ليست لديك صلاحية تعديل Admins' }, 403);
  const body = await request.json().catch(() => ({}));
  const permissions = Array.isArray(body.permissions) ? body.permissions.join(',') : (body.permissions !== undefined ? safeString(body.permissions, 250) : undefined);
  const data = await prisma.admin.update({ where: { id: params.id }, data: { ...(body.name !== undefined ? { name: safeString(body.name, 120) } : {}), ...(body.username !== undefined ? { username: safeString(body.username, 80) } : {}), ...(permissions !== undefined ? { permissions } : {}), ...(body.role !== undefined ? { role: body.role === 'OWNER' ? 'OWNER' : 'ADMIN' } : {}), ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive), currentSessionId: body.isActive ? undefined : null, sessionExpiresAt: body.isActive ? undefined : null } : {}), ...(body.password ? { passwordHash: await bcrypt.hash(String(body.password), 10), currentSessionId: null, sessionExpiresAt: null } : {}) }, select: { id: true, username: true, name: true, role: true, permissions: true, isActive: true } });
  await writeAuditLog(request, 'ADMIN_UPDATE_ADMIN', { adminId: session.sub }, { targetAdminId: params.id });
  return json({ ok: true, data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  if (session.sub === params.id) return json({ ok: false, message: 'لا يمكن حذف حسابك الحالي' }, 400);
  const requester = await prisma.admin.findUnique({ where: { id: session.sub } });
  if (requester?.role !== 'OWNER' && requester?.permissions !== 'ALL') return json({ ok: false, message: 'ليست لديك صلاحية حذف Admins' }, 403);
  await prisma.admin.delete({ where: { id: params.id } });
  await writeAuditLog(request, 'ADMIN_DELETE_ADMIN', { adminId: session.sub }, { targetAdminId: params.id });
  return json({ ok: true });
}
