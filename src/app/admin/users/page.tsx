import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminUsersClient from '@/components/AdminUsersClient';
import { getSession } from '@/lib/session';
import { adminHasPermission } from '@/lib/admin-auth';

export default async function AdminUsersPage() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'USERS' as any))) redirect('/admin/dashboard');
  return (
    <AdminShell title="المستخدمين والكروت">
      <AdminUsersClient />
    </AdminShell>
  );
}
