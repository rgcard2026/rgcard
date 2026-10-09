import { prisma } from './prisma';
import type { SessionPayload } from './session';

export type AdminPermission = 'ALL' | 'DASHBOARD' | 'USERS' | 'PLACES' | 'ADMINS' | 'LOGS' | 'EXPORTS';

export function parsePermissions(value?: string | null): string[] {
  if (!value) return [];
  if (value === 'ALL') return ['ALL'];
  return value.split(',').map((p) => p.trim()).filter(Boolean);
}

export async function adminHasPermission(session: SessionPayload | null, permission: AdminPermission) {
  if (!session || session.role !== 'admin') return false;
  const admin = await prisma.admin.findUnique({ where: { id: session.sub }, select: { isActive: true, role: true, permissions: true } });
  if (!admin?.isActive) return false;
  const perms = parsePermissions(admin.permissions);
  return admin.role === 'OWNER' || perms.includes('ALL') || perms.includes(permission);
}

export function firstAllowedAdminPathFromPermissions(role: string, permissionsValue?: string | null) {
  const perms = role === 'OWNER' ? ['ALL'] : parsePermissions(permissionsValue);
  const has = (p: AdminPermission) => role === 'OWNER' || perms.includes('ALL') || perms.includes(p);
  if (has('DASHBOARD')) return '/admin/dashboard';
  if (has('PLACES')) return '/admin/places';
  if (has('USERS')) return '/admin/users';
  if (has('ADMINS')) return '/admin/admins';
  if (has('LOGS')) return '/admin/logs';
  if (has('EXPORTS')) return '/admin/exports';
  return '/admin/settings';
}

export async function firstAllowedAdminPath(session: SessionPayload | null) {
  if (!session || session.role !== 'admin') return '/admin/login';
  const admin = await prisma.admin.findUnique({ where: { id: session.sub }, select: { role: true, permissions: true } });
  if (!admin) return '/admin/login';
  return firstAllowedAdminPathFromPermissions(admin.role, admin.permissions);
}
