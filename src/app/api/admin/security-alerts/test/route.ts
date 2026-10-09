import { NextRequest } from 'next/server';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { dispatchSecurityAlert, getSecurityAlertConfig } from '@/lib/security-alerts';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  if (!(await adminHasPermission(session, 'LOGS' as any))) return json({ ok: false, message: 'ليست لديك صلاحية إدارة التنبيهات' }, 403);

  const config = await getSecurityAlertConfig();
  if (!config.configured) return json({ ok: false, message: 'لا توجد وسيلة إرسال مُعدّة. أضف Webhook أو أضف إعدادات البريد في Railway ثم بريد المستلم من صفحة التنبيهات.' }, 400);
  if (!config.enabled) return json({ ok: false, message: 'فعّل التنبيهات أولًا ثم أرسل رسالة اختبار.' }, 400);

  const result = await dispatchSecurityAlert(request, 'TEST_SECURITY_ALERT', { severity: 'high', event: 'manual_admin_test' }, { force: true });
  if (!result.sent) return json({ ok: false, message: result.reason === 'delivery-failed' ? 'تعذر إرسال التنبيه. راجع Webhook أو إعدادات بريد Resend في Railway.' : 'لم يتم إرسال التنبيه.' }, 502);

  const channels = result.channels || [];
  await writeAuditLog(request, 'ADMIN_TEST_SECURITY_ALERT', { adminId: session.sub }, { result: 'sent', channels });
  return json({ ok: true, message: `تم إرسال رسالة الاختبار عبر: ${channels.includes('email') ? 'البريد الإلكتروني' : ''}${channels.length === 2 ? ' و ' : ''}${channels.includes('whatsapp') ? 'الـ Webhook' : ''}.` });
}
