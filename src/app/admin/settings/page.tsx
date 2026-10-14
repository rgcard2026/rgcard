'use client';

import * as React from 'react';
import AdminTextField from '@/components/AdminTextField';
import AdminShell from '@/components/AdminShell';
import { Alert, Button, Card, CardContent, CircularProgress, IconButton, InputAdornment, Stack, Typography } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AdminSystemStatusCard from '@/components/AdminSystemStatusCard';
import AdminAppSettingsCard from '@/components/AdminAppSettingsCard';

async function readBody(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { message: text || 'تعذر قراءة رد الخادم' }; }
}

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await readBody(response);
      if (!response.ok) {
        setMsg(body.message || 'تعذر تغيير كلمة المرور');
        return;
      }
      setMsg('تم تغيير كلمة المرور. سيتم تحويلك لتسجيل الدخول مرة أخرى.');
      window.setTimeout(() => { window.location.href = '/admin/login'; }, 1200);
    } catch {
      setMsg('تعذر الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  }

  const endAdornment = (
    <InputAdornment position="end">
      <IconButton type="button" onClick={() => setShow((current) => !current)} aria-label="إظهار أو إخفاء كلمة المرور">
        {show ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <AdminShell title="إعدادات الحساب والأمان">
      <Stack spacing={2.5} sx={{ maxWidth: 980, mx: 'auto' }}>
      <AdminSystemStatusCard />
      <AdminAppSettingsCard />
      <Card className="rg-panel-card">
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack component="form" onSubmit={savePassword} spacing={2}>
            <Typography variant="h5" fontWeight={950}>تغيير كلمة مرور الأدمن</Typography>
            {msg && <Alert severity={msg.includes('تعذر') ? 'error' : 'success'}>{msg}</Alert>}
            <AdminTextField noExpand label="كلمة المرور الحالية" type={show ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required InputProps={{ endAdornment }} />
            <AdminTextField noExpand label="كلمة المرور الجديدة" type={show ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required InputProps={{ endAdornment }} />
            <Button type="submit" className="rg-royal-button" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}>
              {busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      </Stack>
    </AdminShell>
  );
}
