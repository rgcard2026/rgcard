import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminSecurityAlertsClient from '@/components/AdminSecurityAlertsClient';
import { getSession } from '@/lib/session';
import { adminHasPermission } from '@/lib/admin-auth';

export default async function AdminSecurityAlertsPage() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'LOGS' as any))) redirect('/admin/dashboard');

  return (
    <AdminShell title="التنبيهات الأمنية">
      <AdminSecurityAlertsClient />
    </AdminShell>
  );
}
