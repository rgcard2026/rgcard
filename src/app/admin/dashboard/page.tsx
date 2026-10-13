import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminDashboardClient from '@/components/AdminDashboardClient';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { adminHasPermission, firstAllowedAdminPath } from '@/lib/admin-auth';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default async function AdminDashboard() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'DASHBOARD'))) redirect(await firstAllowedAdminPath(session));
  const canExport = await adminHasPermission(session, 'EXPORTS');

  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceDay = startOfDay(since);

  const [users, activeUsers, places, branches, categories, loginLogs, bruteForceAlerts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.place.count(),
    prisma.branch.count(),
    prisma.category.count(),
    prisma.auditLog.findMany({
      where: {
        action: { in: ['USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILED', 'USER_LOGIN_BLOCKED'] },
        createdAt: { gte: sinceDay }
      },
      select: { action: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.auditLog.findMany({
      where: { action: 'BRUTE_FORCE_ALERT' },
      include: { user: { select: { fullName: true, idNumber: true, cardNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const loginSeries = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sinceDay);
    day.setDate(sinceDay.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const dayLogs = loginLogs.filter((log) => log.createdAt.toISOString().slice(0, 10) === key);
    const success = dayLogs.filter((log) => log.action === 'USER_LOGIN_SUCCESS').length;
    return { date: day.toISOString(), success, failed: dayLogs.length - success };
  });

  return (
    <AdminShell title="Dashboard">
      <AdminDashboardClient
        adminName={session.name || ''}
        canExport={canExport}
        stats={{ users, activeUsers, places, branches, categories, alerts: bruteForceAlerts.length }}
        loginSeries={loginSeries}
        alerts={bruteForceAlerts.map((alert) => ({
          id: alert.id,
          name: alert.user?.fullName || '',
          cardNumber: alert.user?.cardNumber || '',
          idNumber: alert.user?.idNumber || '',
          createdAt: alert.createdAt.toISOString()
        }))}
      />
    </AdminShell>
  );
}
