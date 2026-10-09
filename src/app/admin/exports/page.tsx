import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminExportCenterClient from '@/components/AdminExportCenterClient';
import { getSession } from '@/lib/session';
import { adminHasPermission, firstAllowedAdminPath } from '@/lib/admin-auth';

export default async function AdminExportsPage() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'EXPORTS'))) redirect(await firstAllowedAdminPath(session));

  return (
    <AdminShell title="مركز التصدير والكروت">
      <AdminExportCenterClient />
    </AdminShell>
  );
}
