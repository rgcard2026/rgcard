import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [users, activeUsers, places, branches, categories, loginLogs, securityAlerts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.place.count(),
    prisma.branch.count(),
    prisma.category.count(),
    prisma.auditLog.findMany({
      where: { action: { in: ['USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILED', 'USER_LOGIN_BLOCKED'] }, createdAt: { gte: since } },
      select: { action: true, createdAt: true }
    }),
    prisma.auditLog.count({ where: { action: 'BRUTE_FORCE_ALERT' } })
  ]);

  const loginSeries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const dayLogs = loginLogs.filter((log) => log.createdAt.toISOString().slice(0, 10) === key);
    return {
      date: key,
      success: dayLogs.filter((log) => log.action === 'USER_LOGIN_SUCCESS').length,
      failed: dayLogs.filter((log) => log.action !== 'USER_LOGIN_SUCCESS').length
    };
  });

  return json({ ok: true, data: { users, activeUsers, places, branches, categories, securityAlerts, loginSeries } });
}
