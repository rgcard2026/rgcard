import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminAdminsClient from '@/components/AdminAdminsClient';
import { getSession } from '@/lib/session';
import { adminHasPermission } from '@/lib/admin-auth';

export default async function AdminAdminsPage() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'ADMINS' as any))) redirect('/admin/dashboard');
  return <AdminShell title="إدارة الأدمن والصلاحيات"><AdminAdminsClient /></AdminShell>;
}
