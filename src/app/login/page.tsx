'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { encryptForLogin } from '@/lib/clientEncryption';
import { Alert, Box, Button, Card, CardContent, Container, Divider, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import UiControls from '@/components/UiControls';
import { useUiPreferences } from '@/components/UiPreferences';

const enableLoginEncryption = process.env.NEXT_PUBLIC_ENABLE_LOGIN_ENCRYPTION === 'true';

function buildWhatsAppMessage(template?: string, identifier?: string) {
  const cleanId = (identifier || '').trim();
  const base = template?.trim() || 'مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}';
  return base
    .replace(/{{\s*id\s*}}/gi, cleanId)
    .replace(/{{\s*cardNumber\s*}}/gi, cleanId)
    .replace(/{{\s*name\s*}}/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function whatsappUrl(identifier?: string, supportNumber?: string, template?: string) {
  const number = supportNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000033494';
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(template, identifier))}`;
}

export default function LoginPage() {
  const router = useRouter();
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';
  const [qrCard, setQrCard] = React.useState('');
  const [idNumber, setIdNumber] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [whatsappNumber, setWhatsappNumber] = React.useState(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000033494');
  const [whatsappMessage, setWhatsappMessage] = React.useState('مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}');

  React.useEffect(() => {
    const cardFromQr = String(new URLSearchParams(window.location.search).get('card') || '').trim().slice(0, 80);
    if (cardFromQr) {
      setQrCard(cardFromQr);
      setIdNumber(cardFromQr);
    }
  }, []);

  React.useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((body) => {
      if (body?.data?.whatsappNumber) setWhatsappNumber(body.data.whatsappNumber);
      if (body?.data?.whatsappMessage) setWhatsappMessage(body.data.whatsappMessage);
    }).catch(() => null);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let body: Record<string, string> = { idNumber, password };
    if (enableLoginEncryption) {
      try {
        body = { payload: await encryptForLogin({ idNumber, password }) };
      } catch {
        setLoading(false);
        return setError(isArabic ? 'تعذر تشفير بيانات الدخول. استخدم HTTPS أو عطّل التشفير في بيئة التطوير.' : 'Unable to encrypt the sign-in request. Use HTTPS or disable encryption in development.');
      }
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const responseBody = await res.json();
    setLoading(false);
    if (!res.ok) return setError(responseBody.message || (isArabic ? 'بيانات الدخول غير صحيحة' : 'Invalid sign-in details'));
    router.push(responseBody.redirectTo || '/valid');
  }

  return (
    <Box className="rg-login-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Box className="rg-login-hero">
        <Container maxWidth="md">
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}><UiControls /></Stack>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
            <Box className="rg-crown-mark">♛</Box>
            <Box>
              <Typography className="rg-brand-title" variant="h3">RG-Card</Typography>
              <Typography className="rg-brand-subtitle">{isArabic ? 'برنامج الخصومات والعروض' : 'Discounts & offers membership'}</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 5 }, mt: { xs: -2, md: -4 } }}>
        <Card className="rg-auth-card">
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Stack spacing={2.5} component="form" onSubmit={submit}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" className="rg-section-title">{isArabic ? 'تسجيل الدخول' : 'Sign in'}</Typography>
                  <Typography color="text.secondary" sx={{ mt: .6 }}>{isArabic ? 'ادخل رقم الكارت أو الرقم التعريفي وكلمة المرور.' : 'Enter your card number or ID together with your password.'}</Typography>
                </Box>
                <Tooltip title={t('whatsapp')}>
                  <IconButton component="a" href={whatsappUrl(idNumber, whatsappNumber, whatsappMessage)} target="_blank" rel="noopener noreferrer" className="rg-whatsapp-button" aria-label="WhatsApp support">
                    <WhatsAppIcon sx={{ fontSize: 36 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Divider />
              {!enableLoginEncryption && <Alert severity="info" sx={{ borderRadius: 3 }}>{isArabic ? 'وضع التطوير مفعّل: تشفير طلب الدخول معطل مؤقتًا لتسهيل الاختبار من الموبايل.' : 'Development mode: login request encryption is temporarily disabled for local testing.'}</Alert>}
              {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
              <TextField className="rg-premium-input" label={qrCard ? (isArabic ? 'رقم الكارت من QR' : 'Card number from QR') : (isArabic ? 'رقم الكارت / الرقم التعريفي' : 'Card number / ID')} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required helperText={qrCard ? (isArabic ? 'تم إدخال رقم الكارت تلقائيًا من QR. اكتب كلمة المرور فقط.' : 'Your card number was filled from the QR code. Enter your password only.') : undefined} InputProps={{ readOnly: Boolean(qrCard), startAdornment: <BadgeRoundedIcon sx={{ ml: 1, color: 'text.secondary' }} /> }} />
              <TextField autoFocus={Boolean(qrCard)} className="rg-premium-input" label={isArabic ? 'كلمة المرور' : 'Password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required InputProps={{ startAdornment: <LockRoundedIcon sx={{ ml: 1, color: 'text.secondary' }} />, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}</IconButton></InputAdornment> }} />
              <Button className="rg-royal-button" type="submit" variant="contained" size="large" disabled={loading}>{loading ? (isArabic ? 'جاري التحقق...' : 'Verifying...') : (isArabic ? 'تسجيل الدخول' : 'Sign in')}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
