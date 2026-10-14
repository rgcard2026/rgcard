'use client';

import * as React from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { useUiPreferences } from './UiPreferences';

type AlertItem = {
  id: number;
  action: string;
  path: string;
  ip: string;
  createdAt: string;
  reviewed: boolean;
};

function grouped(items: AlertItem[], locale: string) {
  const out = new Map<string, AlertItem[]>();
  for (const item of items) {
    const key = new Date(item.createdAt).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    out.set(key, [...(out.get(key) || []), item]);
  }
  return Array.from(out.entries());
}

function label(action: string, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    BRUTE_FORCE_ALERT: ['محاولات دخول متكررة', 'Repeated login attempts'],
    ADMIN_BRUTE_FORCE_ALERT: ['محاولات دخول متكررة على الإدارة', 'Repeated admin login attempts'],
    SECURITY_ATTACK_BLOCKED: ['تم حظر طلب مشبوه', 'Suspicious request blocked'],
    LOGIN_RATE_ALERT: ['معدل محاولات دخول مرتفع', 'High login attempt rate'],
    LOGIN_PAYLOAD_DECRYPT_FAILED: ['فشل قراءة بيانات دخول المستخدم', 'User login payload failure'],
    ADMIN_LOGIN_PAYLOAD_DECRYPT_FAILED: ['فشل قراءة بيانات دخول الإدارة', 'Admin login payload failure']
  };
  return labels[action]?.[ar ? 0 : 1] || action;
}

export default function SecurityAlertReviewPanel() {
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';
  const [items, setItems] = React.useState<AlertItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/security-alerts/review', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body?.ok) throw new Error(body?.message || 'load_failed');
      setItems(body.data || []);
    } catch {
      setError(t('adm_302'));
    } finally { setLoading(false); }
  }, [isArabic]);

  React.useEffect(() => { load(); }, [load]);

  async function markReviewed(id: number) {
    setBusy(id);
    try {
      const response = await fetch('/api/admin/security-alerts/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId: id })
      });
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => item.id === id ? { ...item, reviewed: true } : item));
    } catch {
      setError(t('adm_303'));
    } finally { setBusy(null); }
  }

  const groups = grouped(items, isArabic ? 'ar-EG' : 'en-GB');
  return (
    <Card className="rg-panel-card rg-security-review-card" sx={{ mt: 2.5 }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.3} sx={{ mb: 1.7 }}>
          <Stack direction="row" spacing={1} alignItems="center"><SecurityRoundedIcon color="error" /><Box><Typography variant="h6" fontWeight={950}>{t('adm_304')}</Typography><Typography fontSize={13} color="text.secondary">{t('adm_305')}</Typography></Box></Stack>
          <Button size="small" variant="outlined" onClick={load}>{t('adm_306')}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {loading ? <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={28} /></Stack> : groups.length ? <Stack spacing={2.2}>{groups.map(([date, alerts]) => <Box key={date}><Typography fontWeight={950} className="rg-security-review-date">{date}</Typography><Stack spacing={1} sx={{ mt: 1 }}>{alerts.map((alert) => <Box key={alert.id} className={`rg-security-review-row ${alert.reviewed ? 'is-reviewed' : ''}`}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}><Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={.7} alignItems="center" flexWrap="wrap" useFlexGap><Typography fontWeight={900}>{label(alert.action, isArabic)}</Typography><Chip size="small" color={alert.reviewed ? 'success' : 'warning'} label={alert.reviewed ? (t('adm_307')) : (t('adm_308'))} /></Stack><Typography color="text.secondary" fontSize={12} className="rg-security-review-path" title={`${alert.ip} • ${alert.path}`}>{alert.ip} • {alert.path || '/'}</Typography><Typography color="text.secondary" fontSize={11}>{new Date(alert.createdAt).toLocaleString(isArabic ? 'ar-EG' : 'en-GB')}</Typography></Box>{!alert.reviewed && <Button size="small" variant="outlined" color="success" startIcon={busy === alert.id ? <CircularProgress size={14} /> : <DoneAllRoundedIcon />} onClick={() => markReviewed(alert.id)} disabled={busy === alert.id}>{t('adm_309')}</Button>}</Stack></Box>)}</Stack></Box>)}</Stack> : <Typography color="text.secondary" align="center" sx={{ py: 3 }}>{t('adm_310')}</Typography>}
      </CardContent>
    </Card>
  );
}
