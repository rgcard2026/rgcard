import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { parsePermissions } from '@/lib/admin-auth';

const PERMISSIONS = ['DASHBOARD', 'USERS', 'PLACES', 'ADMINS', 'LOGS', 'EXPORTS', 'SETTINGS'] as const;

export async function GET(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  const admin = await prisma.admin.findUnique({ where: { id: session.sub }, select: { id: true, name: true, username: true, role: true, permissions: true, isActive: true } });
  if (!admin?.isActive) return unauthorized();
  const permissions = admin.role === 'OWNER' ? ['ALL'] : parsePermissions(admin.permissions);
  const can = Object.fromEntries(PERMISSIONS.map((p) => [p, admin.role === 'OWNER' || permissions.includes('ALL') || permissions.includes(p)]));
  return json({ ok: true, data: { ...admin, permissions, can } });
}
