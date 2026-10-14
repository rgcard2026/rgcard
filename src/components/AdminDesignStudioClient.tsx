'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AdminTextField from './AdminTextField';
import AdminActionToggle from './AdminActionToggle';
import { applyDesignSettings } from './DesignThemeRuntime';
import { TRANSLATION_KEYS, DEFAULT_COPY } from './UiPreferences';
import MemberCard from './MemberCard';
import { CARD_TEMPLATE, type CardRenderLayout } from '@/lib/card-layout';
import { DESIGN_DEFAULTS } from '@/lib/design-defaults';

const defaults = {
  ...DESIGN_DEFAULTS,
  cardCanvasWidth: CARD_TEMPLATE.width,
  cardCanvasHeight: CARD_TEMPLATE.height,
  cardTemplateUrl: CARD_TEMPLATE.templateUrl || '/card-template.png',
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
  uiTextOverrides: {} as Record<string, Record<string, string>>,
};

type DesignState = typeof defaults;
type Notice = { text: string; severity: 'success' | 'error' } | null;

const fontOptions = [
  'IBM Plex Sans Arabic',
  'Cairo',
  'Tajawal',
  'Noto Kufi Arabic',
  'Noto Sans Arabic',
  'Almarai',
  'Changa',
  'El Messiri',
  'Amiri',
  'Readex Pro',
  'Alexandria',
  'Reem Kufi',
  'Arial',
  'Tahoma',
  'Segoe UI',
  'Verdana',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Outfit',
  'Inter',
  'Poppins',
  'Montserrat',
  'Roboto',
];

const PREVIEW_QR = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="white"/><path fill="black" d="M8 8h34v34H8zm8 8v18h18V16zm56-8h34v34H72zm8 8v18h18V16zM8 72h34v34H8zm8 8v18h18V80zm40-64h8v8h-8zm0 20h8v8h-8zm0 16h8v8h-8zm20 0h8v8h-8zm20 0h8v8h-8zM48 64h12v12H48zm20 8h8v8h-8zm16 8h20v20H84z"/></svg>')}`;

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, message: text || 'Unable to read server response' };
  }
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = 'px',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontWeight={850}>{label}</Typography>
        <Typography color="text.secondary" fontWeight={800}>{value}{suffix}</Typography>
      </Stack>
      <Slider value={value} min={min} max={max} step={step} onChange={(_, next) => onChange(Number(next))} />
    </div>
  );
}

export default function AdminDesignStudioClient() {
  const router = useRouter();
  const [settings, setSettings] = React.useState<DesignState>(defaults);
  const [notice, setNotice] = React.useState<Notice>(null);
  const [busy, setBusy] = React.useState(false);
  const cardLayout = React.useMemo<CardRenderLayout>(() => ({
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

  React.useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(readJson)
      .then((body) => {
        if (body?.data) {
          const next = { ...defaults, ...body.data } as DesignState;
          setSettings(next);
          applyDesignSettings(next);
        }
      })
      .catch(() => setNotice({ text: 'تعذر تحميل إعدادات التصميم', severity: 'error' }));
  }, []);

  function update<K extends keyof DesignState>(key: K, value: DesignState[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    applyDesignSettings(next);
  }

  function setTextOverride(lang: 'ar' | 'en', key: string, value: string) {
    setSettings((current) => {
      const overrides = { ...(current.uiTextOverrides || {}) } as Record<string, Record<string, string>>;
      const bucket = { ...(overrides[lang] || {}) };
      const trimmed = value.trim();
      if (trimmed) bucket[key] = trimmed; else delete bucket[key];
      overrides[lang] = bucket;
      const next = { ...current, uiTextOverrides: overrides };
      // Live-update the shell labels as the admin types.
      window.dispatchEvent(new CustomEvent('rg-text-updated', { detail: overrides }));
      return next;
    });
  }

  async function save(closeAfter: boolean) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const body = await readJson(response);
      if (!response.ok) {
        setNotice({ text: body.message || 'تعذر حفظ التصميم', severity: 'error' });
        return;
      }
      const next = { ...defaults, ...body.data } as DesignState;
      setSettings(next);
      applyDesignSettings(next);
      window.dispatchEvent(new CustomEvent('rg-design-updated', { detail: next }));
      window.dispatchEvent(new CustomEvent('rg-text-updated', { detail: next.uiTextOverrides || {} }));
      setNotice({
        text: closeAfter ? 'تم حفظ التصميم بنجاح — جاري العودة للوحة التحكم' : 'تم حفظ التصميم وتطبيقه بنجاح',
        severity: 'success',
      });
      if (closeAfter) window.setTimeout(() => router.push('/admin/dashboard'), 1100);
    } catch {
      setNotice({ text: 'تعذر الاتصال بالخادم أثناء حفظ التصميم', severity: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append('background', file);
      const response = await fetch('/api/admin/design/background', { method: 'POST', body: form });
      const body = await readJson(response);
      if (!response.ok) {
        setNotice({ text: body.message || 'تعذر رفع الخلفية', severity: 'error' });
        return;
      }
      const next = { ...defaults, ...body.data } as DesignState;
      setSettings(next);
      applyDesignSettings(next);
      setNotice({ text: 'تم رفع الخلفية وتفعيلها بنجاح', severity: 'success' });
    } catch {
      setNotice({ text: 'تعذر الاتصال بالخادم أثناء رفع الخلفية', severity: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function uploadLoginBanner(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append('banner', file);
      const response = await fetch('/api/admin/design/login-banner', { method: 'POST', body: form });
      const body = await readJson(response);
      if (!response.ok) {
        setNotice({ text: body.message || 'تعذر رفع صورة بانر تسجيل الدخول', severity: 'error' });
        return;
      }
      const next = { ...defaults, ...body.data } as DesignState;
      setSettings(next);
      applyDesignSettings(next);
      setNotice({ text: 'تم رفع صورة البانر وتفعيلها بنجاح', severity: 'success' });
    } catch {
      setNotice({ text: 'تعذر الاتصال بالخادم أثناء رفع صورة البانر', severity: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function uploadCardTemplate(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append('template', file);
      const response = await fetch('/api/admin/card-design/template', { method: 'POST', body: form });
      const body = await readJson(response);
      if (!response.ok) {
        setNotice({ text: body.message || 'تعذر رفع تصميم الكارت', severity: 'error' });
        return;
      }
      const next = { ...defaults, ...settings, ...body.data } as DesignState;
      setSettings(next);
      applyDesignSettings(next);
      setNotice({ text: 'تم رفع تصميم الكارت الجديد واعتماده بنجاح. تظهر نفس الصورة في المعاينة وملفات PDF.', severity: 'success' });
    } catch {
      setNotice({ text: 'تعذر الاتصال بالخادم أثناء رفع تصميم الكارت', severity: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const colors: Array<[keyof DesignState, string]> = [
    ['designPrimaryColor', 'اللون الأساسي'],
    ['designSecondaryColor', 'اللون الثانوي'],
    ['designAccentColor', 'لون الحدود والتأكيد'],
    ['designBackgroundColor', 'لون الخلفية'],
    ['designSurfaceColor', 'لون الكروت والأسطح'],
    ['designTextColor', 'لون النص الرئيسي'],
    ['designMutedTextColor', 'لون النص الثانوي'],
    ['designButtonTextColor', 'لون نص الأزرار'],
    ['designInputBackgroundColor', 'لون خلفية الحقول'],
    ['designSuccessColor', 'لون النجاح والتفعيل'],
    ['designDangerColor', 'لون الخطأ والحذف'],
  ];

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={2.5}>
            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>الألوان والخلفية</Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  {colors.map(([key, label]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          component="input"
                          type="color"
                          value={String(settings[key])}
                          onChange={(event) => update(key, event.target.value as never)}
                          sx={{ width: 48, height: 44, border: 0, bgcolor: 'transparent', cursor: 'pointer' }}
                        />
                        <AdminTextField noExpand fullWidth label={label} value={String(settings[key])} onChange={(event) => update(key, event.target.value as never)} />
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                  <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />} disabled={busy}>
                    رفع صورة خلفية
                    <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
                  </Button>
                  <AdminActionToggle
                    checked={settings.designBackgroundImageEnabled}
                    onChange={(checked) => update('designBackgroundImageEnabled', checked)}
                    label="تفعيل صورة الخلفية"
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>طريقة العرض</InputLabel>
                    <Select label="طريقة العرض" value={settings.designBackgroundSize} onChange={(event) => update('designBackgroundSize', String(event.target.value))}>
                      <MenuItem value="cover">Cover</MenuItem>
                      <MenuItem value="contain">Contain</MenuItem>
                      <MenuItem value="auto">Auto</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                <RangeField label="تعتيم صورة الخلفية" value={settings.designBackgroundOverlay} min={0} max={90} suffix="%" onChange={(value) => update('designBackgroundOverlay', value)} />
              </CardContent>
            </Card>

            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>بانر صفحة تسجيل الدخول للمستخدمين</Typography>
                <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>
                  خصّص النصوص والألوان والارتفاع والانحناء والمحاذاة، وارفع صورة خلفية اختيارية. تظهر التغييرات مباشرة في المعاينة وتحفظ مع التصميم.
                </Typography>
                <Box className="rg-login-hero-preview" sx={{ mt: 2, minHeight: 'var(--rg-login-banner-height)' }}>
                  <Box sx={{ width: '100%', px: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent={settings.designLoginBannerContentAlign === 'start' ? 'flex-start' : settings.designLoginBannerContentAlign === 'end' ? 'flex-end' : 'center'} spacing={2}>
                      {settings.designLoginBannerShowLogo && <Box className="rg-crown-mark">{settings.designLoginBannerLogo}</Box>}
                      <Box>
                        <Typography className="rg-brand-title" variant="h3">{settings.designLoginBannerTitle}</Typography>
                        <Typography className="rg-brand-subtitle">{settings.designLoginBannerSubtitleAr}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Box>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={6}>
                    <AdminTextField noExpand fullWidth label="عنوان البانر" value={settings.designLoginBannerTitle} onChange={(event) => update('designLoginBannerTitle', event.target.value)} inputProps={{ maxLength: 60 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <AdminTextField noExpand fullWidth label="رمز الشعار (حتى 4 أحرف)" value={settings.designLoginBannerLogo} onChange={(event) => update('designLoginBannerLogo', event.target.value.slice(0, 4))} inputProps={{ maxLength: 4 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <AdminTextField noExpand fullWidth label="الوصف بالعربية" value={settings.designLoginBannerSubtitleAr} onChange={(event) => update('designLoginBannerSubtitleAr', event.target.value)} inputProps={{ maxLength: 120 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <AdminTextField noExpand fullWidth label="الوصف بالإنجليزية" value={settings.designLoginBannerSubtitleEn} onChange={(event) => update('designLoginBannerSubtitleEn', event.target.value)} inputProps={{ maxLength: 120 }} />
                  </Grid>
                </Grid>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={<Checkbox checked={settings.designLoginBannerShowLogo} onChange={(event) => update('designLoginBannerShowLogo', event.target.checked)} />}
                    label="إظهار الشعار"
                  />
                  <FormControl size="small" sx={{ minWidth: 190 }}>
                    <InputLabel>محاذاة المحتوى</InputLabel>
                    <Select label="محاذاة المحتوى" value={settings.designLoginBannerContentAlign} onChange={(event) => update('designLoginBannerContentAlign', String(event.target.value))}>
                      <MenuItem value="start">بداية البانر</MenuItem>
                      <MenuItem value="center">المنتصف</MenuItem>
                      <MenuItem value="end">نهاية البانر</MenuItem>
                    </Select>
                  </FormControl>
                  <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />} disabled={busy}>
                    رفع صورة للبانر
                    <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadLoginBanner(event.target.files?.[0])} />
                  </Button>
                  <FormControlLabel
                    control={<Checkbox checked={settings.designLoginBannerImageEnabled} onChange={(event) => update('designLoginBannerImageEnabled', event.target.checked)} />}
                    label="استخدام صورة الخلفية"
                  />
                </Stack>
                <Grid container spacing={1.5} sx={{ mt: 1 }}>
                  {([
                    ['designLoginBannerStartColor', 'لون بداية التدرج'],
                    ['designLoginBannerEndColor', 'لون نهاية التدرج'],
                    ['designLoginBannerTextColor', 'لون النص'],
                  ] as Array<[keyof DesignState, string]>).map(([key, label]) => (
                    <Grid item xs={12} sm={4} key={key}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box component="input" type="color" value={String(settings[key])} onChange={(event) => update(key, event.target.value as never)} sx={{ width: 48, height: 44, border: 0, bgcolor: 'transparent', cursor: 'pointer' }} />
                        <AdminTextField noExpand fullWidth label={label} value={String(settings[key])} onChange={(event) => update(key, event.target.value as never)} />
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={4}><RangeField label="ارتفاع البانر" value={settings.designLoginBannerHeight} min={120} max={700} onChange={(value) => update('designLoginBannerHeight', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="انحناء الحواف السفلية" value={settings.designLoginBannerRadius} min={0} max={180} onChange={(value) => update('designLoginBannerRadius', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="شفافية الخلفية" value={settings.designLoginBannerOpacity} min={0} max={100} suffix="%" onChange={(value) => update('designLoginBannerOpacity', value)} /></Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>شفافية ومقاسات عناصر الواجهة</Typography>
                <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>
                  تتحكم هذه الإعدادات في العناصر المشتركة على الموقع. الارتفاع صفر يعني استخدام الارتفاع التلقائي.
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>الكروت والبطاقات</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="الشفافية" value={settings.designCardOpacity} min={0} max={100} suffix="%" onChange={(value) => update('designCardOpacity', value)} />
                      <RangeField label="العرض (0 تلقائي)" value={settings.designCardWidth} min={0} max={100} suffix="%" onChange={(value) => update('designCardWidth', value)} />
                      <RangeField label="الارتفاع (0 تلقائي)" value={settings.designCardHeight} min={0} max={800} onChange={(value) => update('designCardHeight', value)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>الصناديق ومساحات المحتوى</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="الشفافية" value={settings.designBoxOpacity} min={0} max={100} suffix="%" onChange={(value) => update('designBoxOpacity', value)} />
                      <RangeField label="العرض (0 تلقائي)" value={settings.designBoxWidth} min={0} max={100} suffix="%" onChange={(value) => update('designBoxWidth', value)} />
                      <RangeField label="الارتفاع (0 تلقائي)" value={settings.designBoxHeight} min={0} max={800} onChange={(value) => update('designBoxHeight', value)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>حقول الإدخال</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="الشفافية" value={settings.designFieldOpacity} min={0} max={100} suffix="%" onChange={(value) => update('designFieldOpacity', value)} />
                      <RangeField label="العرض (0 تلقائي)" value={settings.designFieldWidth} min={0} max={100} suffix="%" onChange={(value) => update('designFieldWidth', value)} />
                      <RangeField label="الارتفاع (0 تلقائي)" value={settings.designFieldHeight} min={0} max={100} onChange={(value) => update('designFieldHeight', value)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>الأزرار</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="الشفافية" value={settings.designButtonOpacity} min={0} max={100} suffix="%" onChange={(value) => update('designButtonOpacity', value)} />
                      <RangeField label="العرض (0 تلقائي)" value={settings.designButtonWidth} min={0} max={100} suffix="%" onChange={(value) => update('designButtonWidth', value)} />
                      <RangeField label="الارتفاع (0 تلقائي)" value={settings.designButtonHeight} min={0} max={100} onChange={(value) => update('designButtonHeight', value)} />
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>مقاسات وشفافية الكارت وحقوله</Typography>
                <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>
                  غيّر كل طبقة على حدة. إحداثيات ومقاسات الحقول محسوبة على مساحة الكارت، والمعاينة تتحدث مباشرة.
                </Typography>
                <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto', my: 2 }}>
                  <MemberCard
                    cardNumber="896744"
                    qrSrc={PREVIEW_QR}
                    membershipClass="VIP"
                    validUntil="2027-12-31"
                    layout={cardLayout}
                  />
                </Box>
                <Box sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid rgba(214,166,79,.32)', bgcolor: 'rgba(214,166,79,.06)' }}>
                  <Typography fontWeight={900}>رفع تصميم كارت جديد</Typography>
                  <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>
                    ارفع صورة PNG أو JPG بنفس مقاس التصميم الحالي 1573×1000 للحصول على أفضل نتيجة. تُطبّق نفس الصورة على المعاينة وملفات PDF فورًا.
                  </Typography>
                  <Button component="label" variant="contained" startIcon={<UploadFileRoundedIcon />} disabled={busy} sx={{ mt: 1.5 }}>
                    اختيار ورفع التصميم
                    <input hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { uploadCardTemplate(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>مساحة الكارت وصورة التصميم</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="عرض الكارت" value={settings.cardCanvasWidth} min={600} max={2400} onChange={(value) => update('cardCanvasWidth', value)} />
                      <RangeField label="ارتفاع الكارت" value={settings.cardCanvasHeight} min={400} max={1600} onChange={(value) => update('cardCanvasHeight', value)} />
                      <RangeField label="شفافية صورة التصميم" value={settings.cardTemplateOpacity} min={0} max={100} suffix="%" onChange={(value) => update('cardTemplateOpacity', value)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>رمز QR</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="الموضع الأفقي X" value={settings.cardQrX} min={0} max={2400} onChange={(value) => update('cardQrX', value)} />
                      <RangeField label="الموضع الرأسي Y" value={settings.cardQrY} min={0} max={1600} onChange={(value) => update('cardQrY', value)} />
                      <RangeField label="العرض والارتفاع (مربع)" value={settings.cardQrSize} min={60} max={600} onChange={(value) => update('cardQrSize', value)} />
                      <RangeField label="الشفافية" value={settings.cardQrOpacity} min={0} max={100} suffix="%" onChange={(value) => update('cardQrOpacity', value)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>رقم العضوية</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="الموضع الأفقي X" value={settings.cardIdX} min={0} max={2400} onChange={(value) => update('cardIdX', value)} />
                      <RangeField label="الموضع الرأسي Y" value={settings.cardIdY} min={0} max={1600} onChange={(value) => update('cardIdY', value)} />
                      <RangeField label="العرض" value={settings.cardIdWidth} min={40} max={1200} onChange={(value) => update('cardIdWidth', value)} />
                      <RangeField label="الارتفاع" value={settings.cardIdHeight} min={20} max={400} onChange={(value) => update('cardIdHeight', value)} />
                      <RangeField label="حجم الخط" value={settings.cardIdFontSize} min={8} max={120} onChange={(value) => update('cardIdFontSize', value)} />
                      <RangeField label="الشفافية" value={settings.cardIdOpacity} min={0} max={100} suffix="%" onChange={(value) => update('cardIdOpacity', value)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>فئة العضوية</Typography>
                    <Stack spacing={1.5}>
                      <RangeField label="الموضع الأفقي X" value={settings.cardMembershipX} min={0} max={2400} onChange={(value) => update('cardMembershipX', value)} />
                      <RangeField label="الموضع الرأسي Y" value={settings.cardMembershipY} min={0} max={1600} onChange={(value) => update('cardMembershipY', value)} />
                      <RangeField label="العرض" value={settings.cardMembershipWidth} min={40} max={1200} onChange={(value) => update('cardMembershipWidth', value)} />
                      <RangeField label="الارتفاع" value={settings.cardMembershipHeight} min={20} max={400} onChange={(value) => update('cardMembershipHeight', value)} />
                      <RangeField label="حجم الخط" value={settings.cardMembershipFontSize} min={8} max={120} onChange={(value) => update('cardMembershipFontSize', value)} />
                      <RangeField label="الشفافية" value={settings.cardMembershipOpacity} min={0} max={100} suffix="%" onChange={(value) => update('cardMembershipOpacity', value)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography fontWeight={900} sx={{ mb: 1 }}>تاريخ الانتهاء</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}><RangeField label="الموضع الأفقي X" value={settings.cardExpiryX} min={0} max={2400} onChange={(value) => update('cardExpiryX', value)} /></Grid>
                      <Grid item xs={12} sm={6}><RangeField label="الموضع الرأسي Y" value={settings.cardExpiryY} min={0} max={1600} onChange={(value) => update('cardExpiryY', value)} /></Grid>
                      <Grid item xs={12} sm={6}><RangeField label="العرض" value={settings.cardExpiryWidth} min={40} max={1200} onChange={(value) => update('cardExpiryWidth', value)} /></Grid>
                      <Grid item xs={12} sm={6}><RangeField label="الارتفاع" value={settings.cardExpiryHeight} min={20} max={400} onChange={(value) => update('cardExpiryHeight', value)} /></Grid>
                      <Grid item xs={12} sm={6}><RangeField label="حجم الخط" value={settings.cardExpiryFontSize} min={8} max={120} onChange={(value) => update('cardExpiryFontSize', value)} /></Grid>
                      <Grid item xs={12} sm={6}><RangeField label="الشفافية" value={settings.cardExpiryOpacity} min={0} max={100} suffix="%" onChange={(value) => update('cardExpiryOpacity', value)} /></Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>عائلات الخطوط</Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  {([
                    ['designFontFamily', 'خط النصوص العامة'],
                    ['designHeadingFontFamily', 'خط العناوين'],
                    ['designButtonFontFamily', 'خط الأزرار والقوائم'],
                  ] as Array<[keyof DesignState, string]>).map(([key, label]) => (
                    <Grid item xs={12} md={4} key={key}>
                      <FormControl fullWidth>
                        <InputLabel>{label}</InputLabel>
                        <Select label={label} value={String(settings[key])} onChange={(event) => update(key, String(event.target.value) as never)}>
                          {fontOptions.map((font) => <MenuItem value={font} key={font} sx={{ fontFamily: font }}>{font}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                  ))}
                </Grid>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={4}><RangeField label="سُمك النص العام" value={settings.designFontWeight} min={300} max={900} step={100} suffix="" onChange={(value) => update('designFontWeight', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="سُمك العناوين" value={settings.designHeadingWeight} min={300} max={900} step={100} suffix="" onChange={(value) => update('designHeadingWeight', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="سُمك الأزرار" value={settings.designButtonWeight} min={300} max={900} step={100} suffix="" onChange={(value) => update('designButtonWeight', value)} /></Grid>
                </Grid>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                  <FormControlLabel control={<Checkbox checked={settings.designFontStyle === 'italic'} onChange={(event) => update('designFontStyle', event.target.checked ? 'italic' : 'normal')} />} label="النص العام مائل" />
                  <FormControlLabel control={<Checkbox checked={settings.designHeadingStyle === 'italic'} onChange={(event) => update('designHeadingStyle', event.target.checked ? 'italic' : 'normal')} />} label="العناوين مائلة" />
                  <FormControlLabel control={<Checkbox checked={settings.designButtonStyle === 'italic'} onChange={(event) => update('designButtonStyle', event.target.checked ? 'italic' : 'normal')} />} label="الأزرار مائلة" />
                </Stack>
              </CardContent>
            </Card>

            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>أحجام الخط لكل جزء</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={6}><RangeField label="النص العادي" value={settings.designBodyFontSize} min={12} max={24} onChange={(value) => update('designBodyFontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="العنوان الرئيسي H1" value={settings.designH1FontSize} min={26} max={72} onChange={(value) => update('designH1FontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="العنوان H2" value={settings.designH2FontSize} min={22} max={60} onChange={(value) => update('designH2FontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="العنوان H3" value={settings.designH3FontSize} min={18} max={48} onChange={(value) => update('designH3FontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="عنوان الكارت" value={settings.designCardTitleFontSize} min={14} max={36} onChange={(value) => update('designCardTitleFontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="نص الأزرار" value={settings.designButtonFontSize} min={11} max={24} onChange={(value) => update('designButtonFontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="نص الحقول" value={settings.designInputFontSize} min={11} max={24} onChange={(value) => update('designInputFontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="نص القوائم والـSidebar" value={settings.designNavFontSize} min={11} max={24} onChange={(value) => update('designNavFontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="النص الصغير والملاحظات" value={settings.designCaptionFontSize} min={9} max={20} onChange={(value) => update('designCaptionFontSize', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="ارتفاع السطر" value={settings.designLineHeightPercent} min={110} max={240} suffix="%" onChange={(value) => update('designLineHeightPercent', value)} /></Grid>
                  <Grid item xs={12} md={6}><RangeField label="تباعد الحروف" value={settings.designLetterSpacing} min={-2} max={5} step={0.25} suffix="px" onChange={(value) => update('designLetterSpacing', value)} /></Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>استدارة العناصر</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={4}><RangeField label="الأزرار" value={settings.designButtonRadius} min={0} max={50} onChange={(value) => update('designButtonRadius', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="الكروت" value={settings.designCardRadius} min={0} max={60} onChange={(value) => update('designCardRadius', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="حقول الإدخال" value={settings.designInputRadius} min={0} max={40} onChange={(value) => update('designInputRadius', value)} /></Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card className="rg-panel-card rg-design-studio-editor-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>الأزرار والشعارات</Typography>
                <Typography color="text.secondary" fontSize={13} sx={{ mb: 1 }}>تحكم في ظل الأزرار وعرضها وحجم شعارات الأماكن والعروض على الصفحات العامة.</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={4}><RangeField label="قوة ظل الأزرار" value={settings.designButtonShadow} min={0} max={40} onChange={(value) => update('designButtonShadow', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="العرض الداخلي للأزرار" value={settings.designButtonPaddingX} min={8} max={40} onChange={(value) => update('designButtonPaddingX', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="حجم شعارات الأماكن" value={settings.designPlaceLogoScale} min={60} max={180} suffix="%" onChange={(value) => update('designPlaceLogoScale', value)} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card className="rg-panel-card rg-design-preview">
            <CardContent>
              <Typography variant="h5" fontWeight={950}>معاينة مباشرة</Typography>
              <Box className="rg-design-preview-surface" sx={{ mt: 2, p: 2.5 }}>
                <Typography variant="h1">عنوان رئيسي</Typography>
                <Typography variant="h2">عنوان فرعي</Typography>
                <Typography variant="h3">عنوان كارت</Typography>
                <Typography sx={{ my: 1.5 }}>نص تجريبي لمعاينة الخط والألوان وأحجام النصوص والخلفية.</Typography>
                <AdminTextField noExpand fullWidth label="حقل تجريبي" value="RG-Card" />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button variant="contained" className="rg-royal-button">زر أساسي</Button>
                  <Button variant="outlined">زر ثانوي</Button>
                </Stack>
                <Typography variant="caption" display="block" sx={{ mt: 2 }}>نص صغير وملاحظات</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card className="rg-panel-card rg-design-studio-editor-card">
        <CardContent>
          <Typography variant="h5" fontWeight={950}>النصوص والترجمة (أسماء الأزرار والقوائم)</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mb: 1.5 }}>
            عدّل أي نص في الواجهة باللغتين. اترك الحقل فارغًا لاستخدام النص الافتراضي. تظهر التعديلات مباشرة بعد الحفظ.
          </Typography>
          <div style={{ maxHeight: 420, overflowY: 'auto', paddingInlineEnd: 8 }}>
            <Grid container spacing={1.5}>
              {TRANSLATION_KEYS.map((key) => (
                <React.Fragment key={key}>
                  <Grid item xs={12} md={2}><Typography fontWeight={850} fontSize={13} sx={{ pt: 1.4 }}>{key}</Typography></Grid>
                  <Grid item xs={12} md={5}>
                    <AdminTextField noExpand fullWidth size="small" label={`عربي — ${DEFAULT_COPY.ar[key]}`} value={settings.uiTextOverrides?.ar?.[key] || ''} placeholder={DEFAULT_COPY.ar[key]} onChange={(e) => setTextOverride('ar', key, e.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <AdminTextField noExpand fullWidth size="small" label={`EN — ${DEFAULT_COPY.en[key]}`} value={settings.uiTextOverrides?.en?.[key] || ''} placeholder={DEFAULT_COPY.en[key]} onChange={(e) => setTextOverride('en', key, e.target.value)} />
                  </Grid>
                </React.Fragment>
              ))}
            </Grid>
          </div>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button disabled={busy} onClick={() => save(true)} variant="contained" startIcon={<SaveRoundedIcon />} className="rg-royal-button">
          {busy ? 'جاري الحفظ...' : 'حفظ وإغلاق الصفحة'}
        </Button>
        <Button disabled={busy} onClick={() => save(false)} variant="outlined" startIcon={<SaveRoundedIcon />}>
          حفظ بدون مغادرة
        </Button>
        <Button
          disabled={busy}
          variant="outlined"
          startIcon={<RestartAltRoundedIcon />}
          onClick={() => {
            const next = { ...defaults, cardTemplateUrl: settings.cardTemplateUrl };
            setSettings(next);
            applyDesignSettings(next);
            setNotice({ text: 'تم إرجاع القيم الافتراضية للمعاينة فقط. اضغط حفظ لتثبيتها.', severity: 'success' });
          }}
        >
          إرجاع القيم الافتراضية
        </Button>
        <Button variant="text" startIcon={<CloseRoundedIcon />} onClick={() => router.push('/admin/dashboard')}>إغلاق بدون حفظ</Button>
      </Stack>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={5000}
        onClose={(_, reason) => { if (reason !== 'clickaway') setNotice(null); }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
      >
        <Alert severity={notice?.severity || 'success'} variant="filled" onClose={() => setNotice(null)} sx={{ width: '100%', fontWeight: 900 }}>
          {notice?.text || ''}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
