import { NextRequest } from 'next/server';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { getAdminSettings, saveAdminSettings } from '@/lib/settings';
import { adminHasPermission } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  return json({ ok: true, data: await getAdminSettings() });
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const updatesSecurityAlerts = body?.securityAlertEnabled !== undefined || body?.securityAlertCooldownMinutes !== undefined || body?.securityAlertWebhookUrl !== undefined || body?.securityAlertWebhookToken !== undefined || body?.securityAlertEmailTo !== undefined;
  if (updatesSecurityAlerts && !(await adminHasPermission(admin, 'LOGS' as any))) {
    return json({ ok: false, message: 'ليست لديك صلاحية إدارة التنبيهات الأمنية' }, 403);
  }

  try {
    const data = await saveAdminSettings(body || {});
    await writeAuditLog(request, 'ADMIN_UPDATE_APP_SETTINGS', { adminId: admin.sub }, {
      ...data,
      securityAlertWebhookUrl: data.securityAlertWebhookConfigured ? '[configured]' : '[empty]',
      securityAlertWebhookTokenConfigured: data.securityAlertWebhookTokenConfigured,
      securityAlertEmailTo: data.securityAlertEmailConfigured ? '[configured]' : '[empty]'
    });
    return json({ ok: true, data });
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : 'تعذر حفظ الإعدادات' }, 400);
  }
}
