import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminPlacesClient from '@/components/AdminPlacesClient';
import { getSession } from '@/lib/session';
import { adminHasPermission } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export default async function AdminPlacesPage() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'PLACES' as any))) redirect('/admin/dashboard');
  const [categories, governorates] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.governorate.findMany({ orderBy: { name: 'asc' } })
  ]);
  return (
    <AdminShell title="الأماكن والعروض">
      <AdminPlacesClient categories={categories} governorates={governorates} />
    </AdminShell>
  );
}
