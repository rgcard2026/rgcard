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

const defaults = {
  designPrimaryColor: '#1E9A96',
  designSecondaryColor: '#2E52F2',
  designAccentColor: '#53A69A',
  designBackgroundColor: '#FFFFFF',
  designSurfaceColor: '#FFFFFF',
  designTextColor: '#101319',
  designMutedTextColor: '#5F6875',
  designButtonTextColor: '#FFFFFF',
  designInputBackgroundColor: '#FFFFFF',
  designSuccessColor: '#16864A',
  designDangerColor: '#D93939',
  designFontFamily: 'IBM Plex Sans Arabic',
  designHeadingFontFamily: 'IBM Plex Sans Arabic',
  designButtonFontFamily: 'IBM Plex Sans Arabic',
  designFontWeight: 700,
  designHeadingWeight: 900,
  designButtonWeight: 800,
  designFontStyle: 'normal',
  designHeadingStyle: 'normal',
  designButtonStyle: 'normal',
  designBodyFontSize: 16,
  designH1FontSize: 38,
  designH2FontSize: 30,
  designH3FontSize: 24,
  designCardTitleFontSize: 19,
  designButtonFontSize: 15,
  designInputFontSize: 15,
  designNavFontSize: 15,
  designCaptionFontSize: 12,
  designLineHeightPercent: 170,
  designLetterSpacing: 0,
  designButtonRadius: 14,
  designCardRadius: 24,
  designInputRadius: 14,
  designButtonShadow: 14,
  designButtonPaddingX: 18,
  designPlaceLogoScale: 100,
  designBackgroundImageUrl: '',
  designBackgroundImageEnabled: false,
  designBackgroundSize: 'cover',
  designBackgroundOverlay: 12,
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
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontWeight={850}>{label}</Typography>
        <Typography color="text.secondary" fontWeight={800}>{value}{suffix}</Typography>
      </Stack>
      <Slider value={value} min={min} max={max} step={step} onChange={(_, next) => onChange(Number(next))} />
    </Box>
  );
}

export default function AdminDesignStudioClient() {
  const router = useRouter();
  const [settings, setSettings] = React.useState<DesignState>(defaults);
  const [notice, setNotice] = React.useState<Notice>(null);
  const [busy, setBusy] = React.useState(false);

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
            <Card className="rg-panel-card">
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

            <Card className="rg-panel-card">
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

            <Card className="rg-panel-card">
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

            <Card className="rg-panel-card">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>استدارة العناصر</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={4}><RangeField label="الأزرار" value={settings.designButtonRadius} min={0} max={50} onChange={(value) => update('designButtonRadius', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="الكروت" value={settings.designCardRadius} min={0} max={60} onChange={(value) => update('designCardRadius', value)} /></Grid>
                  <Grid item xs={12} md={4}><RangeField label="حقول الإدخال" value={settings.designInputRadius} min={0} max={40} onChange={(value) => update('designInputRadius', value)} /></Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card className="rg-panel-card">
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

      <Card className="rg-panel-card">
        <CardContent>
          <Typography variant="h5" fontWeight={950}>النصوص والترجمة (أسماء الأزرار والقوائم)</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mb: 1.5 }}>
            عدّل أي نص في الواجهة باللغتين. اترك الحقل فارغًا لاستخدام النص الافتراضي. تظهر التعديلات مباشرة بعد الحفظ.
          </Typography>
          <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 1 }}>
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
          </Box>
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
            setSettings(defaults);
            applyDesignSettings(defaults);
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
