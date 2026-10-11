'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Snackbar, Stack, Typography } from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import AdminTextField from '@/components/AdminTextField';
import MemberCard from '@/components/MemberCard';
import { CARD_TEMPLATE, type CardRenderLayout } from '@/lib/card-layout';

const PREVIEW_QR = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="white"/>
  <g fill="#050505">
    <rect x="8" y="8" width="34" height="34"/><rect x="14" y="14" width="22" height="22" fill="white"/><rect x="20" y="20" width="10" height="10"/>
    <rect x="78" y="8" width="34" height="34"/><rect x="84" y="14" width="22" height="22" fill="white"/><rect x="90" y="20" width="10" height="10"/>
    <rect x="8" y="78" width="34" height="34"/><rect x="14" y="84" width="22" height="22" fill="white"/><rect x="20" y="90" width="10" height="10"/>
    <rect x="52" y="10" width="8" height="8"/><rect x="62" y="20" width="8" height="8"/><rect x="52" y="30" width="8" height="8"/>
    <rect x="48" y="48" width="10" height="10"/><rect x="62" y="48" width="8" height="8"/><rect x="76" y="50" width="10" height="10"/>
    <rect x="48" y="64" width="8" height="8"/><rect x="60" y="62" width="12" height="12"/><rect x="80" y="66" width="8" height="8"/>
    <rect x="48" y="80" width="10" height="10"/><rect x="64" y="82" width="8" height="8"/><rect x="78" y="80" width="12" height="12"/>
    <rect x="96" y="52" width="10" height="10"/><rect x="98" y="68" width="8" height="8"/><rect x="94" y="84" width="14" height="14"/>
    <rect x="52" y="100" width="8" height="8"/><rect x="68" y="98" width="10" height="10"/><rect x="84" y="102" width="8" height="8"/>
  </g>
</svg>`)}`;

type SettingsState = {
  whatsappNumber: string;
  sessionMinutes: number;
  cardTemplateUrl: string;
  cardCanvasWidth: number;
  cardCanvasHeight: number;
  cardTemplateOpacity: number;
  cardQrX: number;
  cardQrY: number;
  cardQrSize: number;
  cardQrOpacity: number;
  cardIdX: number;
  cardIdY: number;
  cardIdWidth: number;
  cardIdHeight: number;
  cardIdFontSize: number;
  cardIdOpacity: number;
  cardMembershipX: number;
  cardMembershipY: number;
  cardMembershipWidth: number;
  cardMembershipHeight: number;
  cardMembershipFontSize: number;
  cardMembershipOpacity: number;
  cardExpiryX: number;
  cardExpiryY: number;
  cardExpiryWidth: number;
  cardExpiryHeight: number;
  cardExpiryFontSize: number;
  cardExpiryOpacity: number;
};

const defaults: SettingsState = {
  whatsappNumber: '201000033494',
  sessionMinutes: 60,
  cardTemplateUrl: '/card-template.png',
  cardCanvasWidth: CARD_TEMPLATE.width,
  cardCanvasHeight: CARD_TEMPLATE.height,
  cardTemplateOpacity: 100,
  cardQrX: CARD_TEMPLATE.qr.x,
  cardQrY: CARD_TEMPLATE.qr.y,
  cardQrSize: CARD_TEMPLATE.qr.size,
  cardQrOpacity: 100,
  cardIdX: CARD_TEMPLATE.id.x,
  cardIdY: CARD_TEMPLATE.id.y,
  cardIdWidth: CARD_TEMPLATE.id.width,
  cardIdHeight: CARD_TEMPLATE.id.height,
  cardIdFontSize: CARD_TEMPLATE.id.fontSize,
  cardIdOpacity: 100,
  cardMembershipX: CARD_TEMPLATE.membershipClass.x,
  cardMembershipY: CARD_TEMPLATE.membershipClass.y,
  cardMembershipWidth: CARD_TEMPLATE.membershipClass.width,
  cardMembershipHeight: CARD_TEMPLATE.membershipClass.height,
  cardMembershipFontSize: CARD_TEMPLATE.membershipClass.fontSize,
  cardMembershipOpacity: 100,
  cardExpiryX: CARD_TEMPLATE.expiry.x,
  cardExpiryY: CARD_TEMPLATE.expiry.y,
  cardExpiryWidth: CARD_TEMPLATE.expiry.width,
  cardExpiryHeight: CARD_TEMPLATE.expiry.height,
  cardExpiryFontSize: CARD_TEMPLATE.expiry.fontSize,
  cardExpiryOpacity: 100,
};

async function readBody(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { message: text || 'تعذر قراءة رد الخادم' }; }
}

export default function AdminCardSettingsClient() {
  const [settings, setSettings] = React.useState<SettingsState>(defaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(readBody)
      .then((body) => {
        if (!active || !body?.data) return;
        setSettings((current) => ({ ...current, ...body.data }));
      })
      .catch(() => setNotice({ severity: 'error', text: 'تعذر تحميل إعدادات التطبيق والكارت.' }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const layout = React.useMemo<CardRenderLayout>(() => ({
    ...CARD_TEMPLATE,
    width: settings.cardCanvasWidth,
    height: settings.cardCanvasHeight,
    templateUrl: settings.cardTemplateUrl || '/card-template.png',
    templateOpacity: settings.cardTemplateOpacity / 100,
    qr: {
      x: settings.cardQrX,
      y: settings.cardQrY,
      size: settings.cardQrSize,
      opacity: settings.cardQrOpacity / 100,
    },
    id: {
      x: settings.cardIdX,
      y: settings.cardIdY,
      width: settings.cardIdWidth,
      height: settings.cardIdHeight,
      fontSize: settings.cardIdFontSize,
      opacity: settings.cardIdOpacity / 100,
    },
    membershipClass: {
      x: settings.cardMembershipX,
      y: settings.cardMembershipY,
      width: settings.cardMembershipWidth,
      height: settings.cardMembershipHeight,
      fontSize: settings.cardMembershipFontSize,
      opacity: settings.cardMembershipOpacity / 100,
    },
    expiry: {
      x: settings.cardExpiryX,
      y: settings.cardExpiryY,
      width: settings.cardExpiryWidth,
      height: settings.cardExpiryHeight,
      fontSize: settings.cardExpiryFontSize,
      opacity: settings.cardExpiryOpacity / 100,
    },
  }), [settings]);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const body = await readBody(response);
      if (!response.ok) {
        setNotice({ severity: 'error', text: body.message || 'تعذر حفظ إعدادات التطبيق والكارت.' });
        return;
      }
      setSettings((current) => ({ ...current, ...body.data }));
      setNotice({ severity: 'success', text: 'تم حفظ إعدادات التطبيق والكارت وتحديث المعاينة بنجاح.' });
    } catch {
      setNotice({ severity: 'error', text: 'تعذر الاتصال بالخادم.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        عدّل القيم وشاهد النتيجة مباشرة على الكارت. بعد الحفظ تُستخدم نفس المواضع في المعاينة وملفات PDF.
      </Alert>

      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid item xs={12} lg={5}>
          <Card className="rg-panel-card rg-card-settings-preview-card">
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="h5" fontWeight={950}>معاينة الكارت مباشرة</Typography>
                  <Typography color="text.secondary" fontSize={13}>حرّك QR وتاريخ الانتهاء من الحقول وسيظهر التغيير فورًا.</Typography>
                </Box>
                <MemberCard
                  cardNumber="896744"
                  qrSrc={PREVIEW_QR}
                  membershipClass="VIP"
                  validUntil="2027-12-31"
                  layout={layout}
                  className="rg-card-settings-live-preview"
                />
                <Button component={Link} href="/admin/card-design" variant="outlined" startIcon={<ImageRoundedIcon />}>
                  تغيير صورة وتصميم الكارت
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Card className="rg-panel-card">
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack component="form" onSubmit={save} spacing={2.2}>
                <Typography variant="h5" fontWeight={950}>إعدادات التطبيق والكارت</Typography>

                <AdminTextField
                  noExpand
                  label="رقم واتساب الدعم"
                  value={settings.whatsappNumber}
                  onChange={(event) => update('whatsappNumber', event.target.value)}
                  helperText="اكتب الرقم بصيغة 01000033494 أو 201000033494"
                />

                <AdminTextField
                  noExpand
                  type="number"
                  label="مدة الجلسة (بالدقائق)"
                  value={settings.sessionMinutes}
                  onChange={(event) => update('sessionMinutes', Number(event.target.value))}
                  inputProps={{ min: 5, max: 1440 }}
                  helperText="تنتهي جلسة المستخدم والمسؤول تلقائيًا بعد هذه المدة. الافتراضي 60 دقيقة (ساعة). الحد من 5 إلى 1440 دقيقة."
                />

                <Box>
                  <Typography fontWeight={950}>موضع وحجم QR</Typography>
                  <Typography color="text.secondary" fontSize={13}>إحداثيات الحقول مبنية على مساحة الكارت، ويمكن تعديل المقاسات والشفافية من استوديو التصميم.</Typography>
                </Box>
                <Grid container spacing={1.2}>
                  <Grid item xs={12} sm={4}><AdminTextField noExpand fullWidth type="number" label="QR X" value={settings.cardQrX} onChange={(event) => update('cardQrX', Number(event.target.value))} inputProps={{ min: 0, max: 2400 }} /></Grid>
                  <Grid item xs={12} sm={4}><AdminTextField noExpand fullWidth type="number" label="QR Y" value={settings.cardQrY} onChange={(event) => update('cardQrY', Number(event.target.value))} inputProps={{ min: 0, max: 1600 }} /></Grid>
                  <Grid item xs={12} sm={4}><AdminTextField noExpand fullWidth type="number" label="QR Size" value={settings.cardQrSize} onChange={(event) => update('cardQrSize', Number(event.target.value))} inputProps={{ min: 60, max: 600 }} /></Grid>
                </Grid>

                <Box>
                  <Typography fontWeight={950}>موضع تاريخ الانتهاء</Typography>
                  <Typography color="text.secondary" fontSize={13}>غيّر المكان وحجم الخط مع متابعة المعاينة.</Typography>
                </Box>
                <Grid container spacing={1.2}>
                  <Grid item xs={12} sm={4}><AdminTextField noExpand fullWidth type="number" label="Expiry X" value={settings.cardExpiryX} onChange={(event) => update('cardExpiryX', Number(event.target.value))} inputProps={{ min: 0, max: 2400 }} /></Grid>
                  <Grid item xs={12} sm={4}><AdminTextField noExpand fullWidth type="number" label="Expiry Y" value={settings.cardExpiryY} onChange={(event) => update('cardExpiryY', Number(event.target.value))} inputProps={{ min: 0, max: 1600 }} /></Grid>
                  <Grid item xs={12} sm={4}><AdminTextField noExpand fullWidth type="number" label="Expiry Font" value={settings.cardExpiryFontSize} onChange={(event) => update('cardExpiryFontSize', Number(event.target.value))} inputProps={{ min: 8, max: 120 }} /></Grid>
                </Grid>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button type="submit" variant="contained" className="rg-royal-button" disabled={saving || loading} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}>
                    {saving ? 'جارٍ الحفظ…' : 'حفظ إعدادات التطبيق والكارت'}
                  </Button>
                  <Button type="button" variant="outlined" disabled={saving} startIcon={<RestartAltRoundedIcon />} onClick={() => setSettings((current) => ({ ...defaults, cardTemplateUrl: current.cardTemplateUrl }))}>
                    إرجاع مواضع الكارت الافتراضية
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={Boolean(notice)} autoHideDuration={6500} onClose={(_, reason) => { if (reason !== 'clickaway') setNotice(null); }} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notice?.severity || 'success'} variant="filled" onClose={() => setNotice(null)} sx={{ width: '100%', fontWeight: 900 }}>
          {notice?.text || ''}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
