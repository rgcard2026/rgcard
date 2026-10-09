'use client';

import * as React from 'react';
import AdminTextField from '@/components/AdminTextField';
import AdminShell from '@/components/AdminShell';
import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';

const DEFAULT_MESSAGE = 'مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}';

type Settings = {
  whatsappNumber: string;
  whatsappMessage: string;
  cardTemplateUrl: string;
  cardQrX: number;
  cardQrY: number;
  cardQrSize: number;
  cardExpiryX: number;
  cardExpiryY: number;
  cardExpiryFontSize: number;
};

export default function AdminCardDesignPage() {
  const [settings, setSettings] = React.useState<Settings>({
    whatsappNumber: '201000033494',
    whatsappMessage: DEFAULT_MESSAGE,
    cardTemplateUrl: '/card-template.png',
    cardQrX: 1196,
    cardQrY: 495,
    cardQrSize: 296,
    cardExpiryX: 72,
    cardExpiryY: 870,
    cardExpiryFontSize: 22
  });
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (body?.data) setSettings((prev) => ({ ...prev, ...body.data, whatsappMessage: body.data.whatsappMessage || DEFAULT_MESSAGE }));
      })
      .catch(() => setMsg('تعذر تحميل إعدادات التصميم'));
  }, []);

  React.useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function uploadTemplate() {
    if (!selectedFile) return setMsg('اختار صورة التصميم الأول');
    setSaving(true); setMsg('');
    const form = new FormData();
    form.append('template', selectedFile);
    const res = await fetch('/api/admin/card-design/template', { method: 'POST', body: form });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(body.message || 'تعذر رفع تصميم الكارت');
    setSettings((prev) => ({ ...prev, ...body.data }));
    setSelectedFile(null);
    setMsg('تم رفع التصميم الجديد. افتح صفحة الكارت أو PDF مرة أخرى للمراجعة.');
  }

  async function saveWhatsAppMessage(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whatsappNumber: settings.whatsappNumber,
        whatsappMessage: settings.whatsappMessage,
        cardQrX: settings.cardQrX,
        cardQrY: settings.cardQrY,
        cardQrSize: settings.cardQrSize,
        cardExpiryX: settings.cardExpiryX,
        cardExpiryY: settings.cardExpiryY,
        cardExpiryFontSize: settings.cardExpiryFontSize
      })
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(body.message || 'تعذر حفظ رسالة واتساب');
    setSettings((prev) => ({ ...prev, ...body.data }));
    setMsg('تم حفظ إعدادات واتساب ورسالة الدعم بنجاح.');
  }

  const activePreview = previewUrl || settings.cardTemplateUrl || '/card-template.png';

  return <AdminShell title="تصميم الكارت والواتساب">
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={7}>
        <Card className="rg-panel-card">
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.2}>
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <CreditCardRoundedIcon sx={{ color: '#b8862b' }} />
                <Box>
                  <Typography variant="h5" fontWeight={950}>رفع تصميم كارت جديد</Typography>
                  <Typography color="text.secondary" fontSize={13}>ارفع صورة PNG أو JPG بنفس مقاس التصميم الحالي 1573×1000 للحصول على أفضل نتيجة.</Typography>
                </Box>
              </Stack>
              {msg && <Alert severity={msg.includes('تعذر') || msg.includes('اختار') ? 'error' : 'success'}>{msg}</Alert>}
              <Box sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(214,166,79,.32)', bgcolor: '#090b10', p: 1.2 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activePreview} alt="Card template preview" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 14 }} />
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>
                  اختيار التصميم
                  <input hidden type="file" accept="image/png,image/jpeg" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </Button>
                <Button variant="contained" startIcon={<SaveRoundedIcon />} disabled={saving || !selectedFile} onClick={uploadTemplate}>رفع واعتماد التصميم</Button>
              </Stack>
              <Alert severity="info">بعد رفع تصميم جديد، نفس الصورة هتتطبق على Preview و PDF. لو مكان QR أو تاريخ الانتهاء محتاج ضبط، استخدم صفحة إعدادات التطبيق والكارت لمعاينة وضبط QR وتاريخ الانتهاء مباشرة.</Alert>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={5}>
        <Card className="rg-panel-card">
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack component="form" onSubmit={saveWhatsAppMessage} spacing={2}>
              <Typography variant="h5" fontWeight={950}>رسالة واتساب</Typography>
              <Typography color="text.secondary" fontSize={13}>الرسالة دي تظهر لما المستخدم يضغط على زر واتساب. تقدر تستخدم المتغيرات: {'{{id}}'} أو {'{{cardNumber}}'}.</Typography>
              <AdminTextField label="رقم واتساب الدعم" value={settings.whatsappNumber} onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })} helperText="مثال: 01000033494 أو 201000033494" />
              <AdminTextField label="نص رسالة واتساب" value={settings.whatsappMessage} onChange={(e) => setSettings({ ...settings, whatsappMessage: e.target.value })} multiline minRows={5} inputProps={{ maxLength: 500 }} />
              <Alert severity="info">مثال: مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card Card / ID: {'{{id}}'}</Alert>
              <Button type="submit" variant="contained" startIcon={<SaveRoundedIcon />} disabled={saving}>حفظ رسالة واتساب</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </AdminShell>;
}
