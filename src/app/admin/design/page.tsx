import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminDesignStudioClient from '@/components/AdminDesignStudioClient';
import { getSession } from '@/lib/session';
import { adminHasPermission, firstAllowedAdminPath } from '@/lib/admin-auth';

export default async function AdminDesignPage() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'SETTINGS' as any))) redirect(await firstAllowedAdminPath(session));
  return <AdminShell title="استوديو التصميم"><AdminDesignStudioClient /></AdminShell>;
}
