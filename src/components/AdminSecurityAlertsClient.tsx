'use client';

import * as React from 'react';
import AdminTextField from '@/components/AdminTextField';
import AdminActionToggle from '@/components/AdminActionToggle';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import SecurityAlertReviewPanel from './SecurityAlertReviewPanel';
import { useUiPreferences } from './UiPreferences';

const defaultSettings = {
  securityAlertEnabled: false,
  securityAlertCooldownMinutes: 5,
  securityAlertConfigured: false,
  securityAlertWebhookConfigured: false,
  securityAlertWebhookUrl: '',
  securityAlertWebhookTokenConfigured: false,
  securityAlertConfigSource: 'none',
  securityAlertEmailConfigured: false,
  securityAlertEmailProviderReady: false,
  securityAlertEmailTo: '',
  securityAlertEmailRecipientLabel: '',
  securityAlertEmailConfigSource: 'none'
};

type Settings = typeof defaultSettings;

async function readJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { ok: false, message: text || 'تعذر قراءة رد السيرفر' }; }
}

export default function AdminSecurityAlertsClient() {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';
  const [settings, setSettings] = React.useState<Settings>(defaultSettings);
  const [token, setToken] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(readJson)
      .then((body) => { if (body?.data) setSettings((current) => ({ ...current, ...body.data })); })
      .catch(() => setMsg('تعذر تحميل إعدادات التنبيهات'));
  }, []);

  async function save() {
    setSaving(true); setMsg('');
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        securityAlertEnabled: settings.securityAlertEnabled,
        securityAlertCooldownMinutes: settings.securityAlertCooldownMinutes,
        securityAlertWebhookUrl: settings.securityAlertWebhookUrl,
        securityAlertEmailTo: settings.securityAlertEmailTo,
        ...(token ? { securityAlertWebhookToken: token } : {})
      })
    });
    const body = await readJson(response);
    setSaving(false);
    if (!response.ok || !body?.ok) return setMsg(body?.message || 'تعذر حفظ إعدادات التنبيهات');
    setSettings((current) => ({ ...current, ...body.data }));
    setToken('');
    setMsg('تم حفظ إعدادات التنبيهات. يمكنك إرسال رسالة اختبار الآن.');
  }

  async function sendTest() {
    setTesting(true); setMsg('');
    const response = await fetch('/api/admin/security-alerts/test', { method: 'POST' });
    const body = await readJson(response);
    setTesting(false);
    if (!response.ok || !body?.ok) return setMsg(body?.message || 'تعذر إرسال رسالة الاختبار');
    setMsg(body?.message || 'تم إرسال رسالة الاختبار.');
  }

  const webhookSourceLabel = settings.securityAlertConfigSource === 'environment'
    ? 'يتم استخدام Webhook من Railway Variables'
    : settings.securityAlertConfigSource === 'dashboard'
      ? 'يتم استخدام Webhook المحفوظ من لوحة الإدارة'
      : 'لا يوجد Webhook محفوظ بعد';

  const emailSourceLabel = settings.securityAlertEmailConfigSource === 'environment'
    ? 'بريد المستلم مضبوط من Railway Variables'
    : settings.securityAlertEmailConfigSource === 'dashboard'
      ? 'بريد المستلم محفوظ من لوحة الإدارة'
      : 'لا يوجد بريد مستلم محفوظ بعد';

  const emailFieldLocked = settings.securityAlertEmailConfigSource === 'environment';

  return <>
    <Grid container spacing={2.5}>
    <Grid item xs={12} md={7}>
      <Card className="rg-panel-card">
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.3} alignItems="center">
              <Box className="rg-section-icon-v21"><SecurityRoundedIcon /></Box>
              <Box>
                <Typography variant="h5" fontWeight={950}>{isArabic ? 'تنبيهات الأمن: واتساب والبريد' : 'Security alerts: webhook and email'}</Typography>
                <Typography color="text.secondary" fontSize={13}>{isArabic ? 'يتم التنبيه فقط عند الأحداث عالية الخطورة. لا يتم إرسال كلمات مرور أو أرقام كروت أو محتوى كامل للطلبات.' : 'Only high-risk events trigger alerts. Passwords, card numbers, and full request bodies are never sent.'}</Typography>
              </Box>
            </Stack>
            {msg && <Alert severity={msg.includes('تعذر') || msg.includes('غير صالح') || msg.includes('لا توجد') ? 'error' : 'success'}>{msg}</Alert>}
            <Divider />

            <Typography fontWeight={950}>قناة الـ Webhook / واتساب (اختيارية)</Typography>
            <AdminTextField
              type="url"
              label="Webhook URL"
              value={settings.securityAlertWebhookUrl}
              onChange={(event) => setSettings({ ...settings, securityAlertWebhookUrl: event.target.value })}
              placeholder="https://webhook.site/..."
              helperText="اختياري. يمكن ربطه بـ n8n أو Make لإرسال واتساب. يتم حفظ الرابط مشفرًا ويجب أن يبدأ بـ https://"
              disabled={settings.securityAlertConfigSource === 'environment'}
            />
            <AdminTextField
              type="password"
              label="Webhook Token (اختياري)"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={settings.securityAlertWebhookTokenConfigured ? 'تم حفظ Token سابقًا — اكتب قيمة جديدة للاستبدال' : 'اختياري'}
              helperText="لا يظهر الـ Token المحفوظ مرة أخرى. اتركه فارغًا للاحتفاظ بالقيمة الحالية."
              disabled={settings.securityAlertConfigSource === 'environment'}
            />
            {settings.securityAlertConfigSource === 'environment' && <Alert severity="info">يوجد Webhook مضبوط في Railway Variables؛ لذلك حقول الربط مقفلة وتأخذ قيمة البيئة كأولوية.</Alert>}

            <Divider />
            <Stack direction="row" spacing={1} alignItems="center"><EmailRoundedIcon color="action" /><Typography fontWeight={950}>{isArabic ? 'تنبيهات البريد الإلكتروني' : 'Email alerts'}</Typography></Stack>
            <AdminTextField
              label="البريد المستلم للتنبيهات"
              value={settings.securityAlertEmailTo}
              onChange={(event) => setSettings({ ...settings, securityAlertEmailTo: event.target.value })}
              placeholder="security@example.com, owner@example.com"
              helperText="يمكن إضافة حتى 5 عناوين مفصولة بفاصلة. مفتاح الإرسال وعنوان المرسل يظلان داخل Railway Variables فقط."
              disabled={emailFieldLocked}
            />
            {emailFieldLocked && <Alert severity="info">بريد المستلم مضبوط في Railway Variables؛ لذلك الحقل مقفل ويأخذ التطبيق قيمة البيئة كأولوية.</Alert>}
            {!settings.securityAlertEmailProviderReady && <Alert severity="warning">لتفعيل البريد، أضف RESEND_API_KEY و SECURITY_ALERT_EMAIL_FROM داخل Railway Variables. لا تضع مفتاح Resend داخل لوحة الإدارة.</Alert>}

            <Divider />
            <Stack spacing={0.8}>
              <AdminActionToggle
                checked={settings.securityAlertEnabled}
                onChange={(checked) => setSettings({ ...settings, securityAlertEnabled: checked })}
                label={isArabic ? 'تفعيل التنبيهات' : 'Enable alerts'}
              />
              <Typography color="text.secondary" fontSize={13}>الإرسال يتم عند حظر طلب مشبوه أو تكرار محاولات الدخول أو ظهور نشاط عالي الخطورة.</Typography>
            </Stack>
            <AdminTextField
              type="number"
              label={isArabic ? 'فترة منع التكرار بالدقائق' : 'Cooldown period in minutes'}
              value={settings.securityAlertCooldownMinutes}
              onChange={(event) => setSettings({ ...settings, securityAlertCooldownMinutes: Math.max(1, Math.min(60, Number(event.target.value || 5))) })}
              helperText="منع تكرار نفس التنبيه من نفس IP خلال هذه المدة."
              inputProps={{ min: 1, max: 60 }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save} disabled={saving}>{saving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الإعدادات' : 'Save settings')}</Button>
              <Button variant="outlined" startIcon={<SendRoundedIcon />} onClick={sendTest} disabled={!settings.securityAlertEnabled || !settings.securityAlertConfigured || testing}>{testing ? (isArabic ? 'جاري الإرسال...' : 'Sending...') : (isArabic ? 'إرسال رسالة اختبار' : 'Send test alert')}</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12} md={5}>
      <Card className="rg-panel-card" sx={{ height: '100%' }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={1.4}>
            <Typography variant="h6" fontWeight={950}>{isArabic ? 'حالة الربط' : 'Connection status'}</Typography>
            <Chip
              icon={settings.securityAlertWebhookConfigured ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}
              color={settings.securityAlertWebhookConfigured ? 'success' : 'default'}
              label={settings.securityAlertWebhookConfigured ? 'Webhook للتنبيهات مُعدّ' : 'Webhook غير مُعدّ'}
              sx={{ width: 'fit-content', fontWeight: 900 }}
            />
            <Alert severity={settings.securityAlertWebhookConfigured ? 'info' : 'warning'}>{webhookSourceLabel}</Alert>
            <Chip
              icon={settings.securityAlertEmailConfigured ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}
              color={settings.securityAlertEmailConfigured ? 'success' : 'warning'}
              label={settings.securityAlertEmailConfigured ? 'البريد الإلكتروني مُعدّ' : 'البريد الإلكتروني غير مكتمل الإعداد'}
              sx={{ width: 'fit-content', fontWeight: 900 }}
            />
            <Alert severity={settings.securityAlertEmailConfigured ? 'info' : 'warning'}>
              {emailSourceLabel}{settings.securityAlertEmailRecipientLabel ? ` — ${settings.securityAlertEmailRecipientLabel}` : ''}
            </Alert>
            <Typography color="text.secondary" fontSize={13} lineHeight={1.8}>
              البريد يتم إرساله من السيرفر عبر Resend API. عنوان المرسل يجب أن يكون مربوطًا ومتحققًا في حساب مزود البريد.
            </Typography>
            <Divider />
            <Typography fontWeight={950}>{isArabic ? 'الأحداث التي يتم التنبيه عنها' : 'Alerted events'}</Typography>
            <Stack direction="row" spacing={.8} flexWrap="wrap" useFlexGap>
              <Chip size="small" label="Suspicious requests" />
              <Chip size="small" label="Brute force" />
              <Chip size="small" label="Payload failures" />
              <Chip size="small" label="Blocked sessions" />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    </Grid>
    <SecurityAlertReviewPanel />
  </>;
}
