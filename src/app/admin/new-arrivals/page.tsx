import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminNewArrivalsClient from '@/components/AdminNewArrivalsClient';
import { getSession } from '@/lib/session';
import { adminHasPermission } from '@/lib/admin-auth';

export default async function AdminNewArrivalsPage() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'PLACES' as any))) redirect('/admin/dashboard');

  return (
    <AdminShell title="New Arrival / Coming Soon">
      <AdminNewArrivalsClient />
    </AdminShell>
  );
}
