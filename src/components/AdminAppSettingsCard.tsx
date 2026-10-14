'use client';

import * as React from 'react';
import { Alert, Button, Card, CardContent, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AdminTextField from '@/components/AdminTextField';

const DEFAULT_MESSAGE = 'مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}';

async function readBody(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { message: text || 'تعذر قراءة رد الخادم' }; }
}

export default function AdminAppSettingsCard() {
  const [whatsappNumber, setWhatsappNumber] = React.useState('201000033494');
  const [whatsappMessage, setWhatsappMessage] = React.useState(DEFAULT_MESSAGE);
  const [sessionMinutes, setSessionMinutes] = React.useState(60);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(readBody)
      .then((body) => {
        if (!active || !body?.data) return;
        if (body.data.whatsappNumber) setWhatsappNumber(String(body.data.whatsappNumber));
        setWhatsappMessage(body.data.whatsappMessage || DEFAULT_MESSAGE);
        if (body.data.sessionMinutes) setSessionMinutes(Number(body.data.sessionMinutes));
      })
      .catch(() => setNotice({ severity: 'error', text: 'تعذر تحميل إعدادات التطبيق.' }));
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber, whatsappMessage, sessionMinutes }),
      });
      const body = await readBody(response);
      if (!response.ok) {
        setNotice({ severity: 'error', text: body.message || 'تعذر حفظ الإعدادات.' });
        return;
      }
      if (body.data) {
        if (body.data.whatsappNumber) setWhatsappNumber(String(body.data.whatsappNumber));
        setWhatsappMessage(body.data.whatsappMessage || DEFAULT_MESSAGE);
        if (body.data.sessionMinutes) setSessionMinutes(Number(body.data.sessionMinutes));
      }
      setNotice({ severity: 'success', text: 'تم حفظ إعدادات واتساب والجلسة بنجاح.' });
    } catch {
      setNotice({ severity: 'error', text: 'تعذر الاتصال بالخادم.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rg-panel-card">
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack component="form" onSubmit={save} spacing={2}>
          <Typography variant="h5" fontWeight={950}>إعدادات واتساب والجلسة</Typography>
          <Typography color="text.secondary" fontSize={13}>
            رقم ونص رسالة واتساب الدعم تظهر للمستخدم عند الضغط على زر واتساب. يمكنك استخدام المتغيرات: {'{{id}}'} أو {'{{cardNumber}}'}.
          </Typography>
          <AdminTextField noExpand label="رقم واتساب الدعم" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} helperText="مثال: 01000033494 أو 201000033494" />
          <AdminTextField noExpand label="نص رسالة واتساب" value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} multiline minRows={5} inputProps={{ maxLength: 500 }} />
          <AdminTextField noExpand type="number" label="مدة الجلسة (بالدقائق)" value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))} inputProps={{ min: 5, max: 1440 }} helperText="تنتهي جلسة المستخدم والمسؤول تلقائيًا بعد هذه المدة. الافتراضي 60 دقيقة." />
          <Button type="submit" variant="contained" className="rg-royal-button" disabled={saving} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ إعدادات واتساب والجلسة'}
          </Button>
        </Stack>
        <Snackbar open={!!notice} autoHideDuration={5000} onClose={(_e, reason) => { if (reason !== 'clickaway') setNotice(null); }} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={notice?.severity || 'success'} variant="filled" onClose={() => setNotice(null)} sx={{ width: '100%', fontWeight: 900 }}>{notice?.text || ''}</Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
