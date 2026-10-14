'use client';

import * as React from 'react';
import AdminTextField from '@/components/AdminTextField';
import AdminShell from '@/components/AdminShell';
import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import Link from 'next/link';

const DEFAULT_MESSAGE = 'مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}';

type Settings = {
  whatsappNumber: string;
  whatsappMessage: string;
};

export default function AdminCardDesignPage() {
  const [settings, setSettings] = React.useState<Settings>({
    whatsappNumber: '201000033494',
    whatsappMessage: DEFAULT_MESSAGE,
  });
  const [msg, setMsg] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (body?.data) setSettings((prev) => ({ ...prev, whatsappNumber: body.data.whatsappNumber || prev.whatsappNumber, whatsappMessage: body.data.whatsappMessage || DEFAULT_MESSAGE }));
      })
      .catch(() => setMsg('تعذر تحميل إعدادات الواتساب'));
  }, []);

  async function saveWhatsAppMessage(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whatsappNumber: settings.whatsappNumber,
        whatsappMessage: settings.whatsappMessage,
      })
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(body.message || 'تعذر حفظ رسالة واتساب');
    setSettings((prev) => ({ ...prev, ...body.data }));
    setMsg('تم حفظ إعدادات واتساب ورسالة الدعم بنجاح.');
  }

  return <AdminShell title="تصميم الكارت والواتساب">
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={7}>
        <Card className="rg-panel-card">
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack component="form" onSubmit={saveWhatsAppMessage} spacing={2}>
              <Typography variant="h5" fontWeight={950}>رسالة واتساب</Typography>
              <Typography color="text.secondary" fontSize={13}>الرسالة دي تظهر لما المستخدم يضغط على زر واتساب. تقدر تستخدم المتغيرات: {'{{id}}'} أو {'{{cardNumber}}'}.</Typography>
              {msg && <Alert severity={msg.includes('تعذر') ? 'error' : 'success'}>{msg}</Alert>}
              <AdminTextField label="رقم واتساب الدعم" value={settings.whatsappNumber} onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })} helperText="مثال: 01000033494 أو 201000033494" />
              <AdminTextField label="نص رسالة واتساب" value={settings.whatsappMessage} onChange={(e) => setSettings({ ...settings, whatsappMessage: e.target.value })} multiline minRows={5} inputProps={{ maxLength: 500 }} />
              <Alert severity="info">مثال: مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card Card / ID: {'{{id}}'}</Alert>
              <Button type="submit" variant="contained" startIcon={<SaveRoundedIcon />} disabled={saving}>حفظ رسالة واتساب</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={5}>
        <Card className="rg-panel-card">
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <PaletteRoundedIcon sx={{ color: '#b8862b' }} />
                <Typography variant="h5" fontWeight={950}>رفع تصميم كارت جديد</Typography>
              </Stack>
              <Typography color="text.secondary" fontSize={13}>
                تم نقل رفع تصميم الكارت إلى «استوديو التصميم» مع معاينة مباشرة ومقاسات وشفافية كل حقل.
              </Typography>
              <Button component={Link} href="/admin/design" variant="outlined" startIcon={<PaletteRoundedIcon />}>فتح استوديو التصميم</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </AdminShell>;
}
