import AdminShell from '@/components/AdminShell';
import AdminCardSettingsClient from '@/components/AdminCardSettingsClient';

export default function AdminCardSettingsPage() {
  return (
    <AdminShell title="إعدادات التطبيق والكارت">
      <AdminCardSettingsClient />
    </AdminShell>
  );
}
