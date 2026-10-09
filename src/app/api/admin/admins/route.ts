import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { safeString } from '@/lib/security';

export async function GET(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  const data = await prisma.admin.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, username: true, name: true, role: true, permissions: true, isActive: true, createdAt: true } });
  return json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  const creator = await prisma.admin.findUnique({ where: { id: session.sub } });
  if (creator?.role !== 'OWNER' && !creator?.permissions.includes('ADMINS') && creator?.permissions !== 'ALL') return json({ ok: false, message: 'ليست لديك صلاحية إضافة Admins' }, 403);
  const body = await request.json().catch(() => ({}));
  if (!body.username || !body.name || !body.password) return badRequest('الاسم واسم المستخدم وكلمة المرور مطلوبين');
  const permissions = Array.isArray(body.permissions) ? body.permissions.join(',') : safeString(body.permissions || 'DASHBOARD');
  const data = await prisma.admin.create({ data: { username: safeString(body.username, 80), name: safeString(body.name, 120), passwordHash: await bcrypt.hash(String(body.password), 10), role: body.role === 'OWNER' ? 'OWNER' : 'ADMIN', permissions, isActive: body.isActive !== false }, select: { id: true, username: true, name: true, role: true, permissions: true, isActive: true } });
  await writeAuditLog(request, 'ADMIN_CREATE_ADMIN', { adminId: session.sub }, { createdAdminId: data.id, username: data.username, permissions });
  return json({ ok: true, data }, 201);
}
