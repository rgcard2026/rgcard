'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { encryptForLogin } from '@/lib/clientEncryption';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { AnimatePresence, motion } from 'framer-motion';
import AuthLayout from '@/components/ui/AuthLayout';
import { useUiPreferences } from '@/components/UiPreferences';
import { useSupportLink } from '@/components/ui/useSupportLink';

const enableLoginEncryption = process.env.NEXT_PUBLIC_ENABLE_LOGIN_ENCRYPTION === 'true';
const defaultBanner = {
  designLoginBannerTitle: 'RG-Card',
  designLoginBannerSubtitleAr: 'برنامج الخصومات والعروض',
  designLoginBannerSubtitleEn: 'Discounts & offers membership',
  designLoginBannerShowLogo: true,
  designLoginBannerContentAlign: 'start' as 'start' | 'center' | 'end'
};

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
  const [signedIn, setSignedIn] = React.useState(false);
  const [banner, setBanner] = React.useState(defaultBanner);
  const supportLink = useSupportLink(idNumber);

  React.useEffect(() => {
    const cardFromQr = String(new URLSearchParams(window.location.search).get('card') || '').trim().slice(0, 80);
    if (cardFromQr) {
      setQrCard(cardFromQr);
      setIdNumber(cardFromQr);
    }
    fetch('/api/settings').then((r) => r.json()).then((body) => {
      if (body?.data) setBanner((current) => ({ ...current, ...body.data }));
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

    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const responseBody = await res.json();
      if (!res.ok) {
        setLoading(false);
        return setError(responseBody.message || (isArabic ? 'بيانات الدخول غير صحيحة' : 'Invalid sign-in details'));
      }
      setSignedIn(true);
      router.push(responseBody.redirectTo || '/valid');
    } catch {
      setLoading(false);
      setError(isArabic ? 'تعذر الاتصال بالخادم. حاول مرة أخرى.' : 'Could not reach the server. Please try again.');
    }
  }

  const footer = (
    <div className="ui-auth-foot">
      <span>{isArabic ? 'تواجه مشكلة في الدخول؟' : 'Trouble signing in?'}</span>
      <a href={supportLink} target="_blank" rel="noopener noreferrer"><WhatsAppIcon />{t('whatsapp')}</a>
    </div>
  );

  return (
    <AuthLayout
      title={isArabic ? 'تسجيل الدخول' : 'Sign in'}
      subtitle={isArabic ? 'ادخل رقم البطاقة أو الرقم التعريفي وكلمة المرور.' : 'Enter your card number or ID with your password.'}
      brandTitle={banner.designLoginBannerTitle || 'RG-Card'}
      brandSubtitle={isArabic ? banner.designLoginBannerSubtitleAr : banner.designLoginBannerSubtitleEn}
      align={banner.designLoginBannerContentAlign}
      showLogo={banner.designLoginBannerShowLogo}
      footer={footer}
    >
      <form className="ui-auth-form" onSubmit={submit} noValidate={false}>
        {error && (
          <div className="ui-alert ui-alert--error" role="alert"><ErrorOutlineRoundedIcon />{error}</div>
        )}
        {!enableLoginEncryption && process.env.NODE_ENV === 'development' && (
          <div className="ui-hint">{isArabic ? 'بيئة تطوير: تشفير طلب الدخول معطّل.' : 'Development: login encryption disabled.'}</div>
        )}

        <div className="ui-field">
          <label className="ui-label" htmlFor="login-id">{qrCard ? (isArabic ? 'رقم البطاقة من QR' : 'Card number from QR') : (isArabic ? 'رقم البطاقة / الرقم التعريفي' : 'Card number / ID')}</label>
          <div className="ui-input-wrap">
            {qrCard ? <QrCode2RoundedIcon /> : <BadgeRoundedIcon />}
            <input id="login-id" className="ui-input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} readOnly={Boolean(qrCard)} required autoComplete="username" inputMode="text" />
          </div>
          {qrCard && <span className="ui-hint">{isArabic ? 'تم إدخال رقم البطاقة تلقائيًا من QR. اكتب كلمة المرور فقط.' : 'Your card number was filled from the QR code. Enter your password only.'}</span>}
        </div>

        <div className="ui-field">
          <label className="ui-label" htmlFor="login-password">{isArabic ? 'كلمة المرور' : 'Password'}</label>
          <div className="ui-input-wrap">
            <LockRoundedIcon />
            <input id="login-password" className="ui-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" autoFocus={Boolean(qrCard)} />
            <button type="button" className="ui-input-action" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? (isArabic ? 'إخفاء كلمة المرور' : 'Hide password') : (isArabic ? 'إظهار كلمة المرور' : 'Show password')}>
              {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
            </button>
          </div>
        </div>

        <button className="ui-btn ui-btn--primary ui-btn--block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? (isArabic ? 'جاري التحقق...' : 'Verifying...') : (isArabic ? 'دخول' : 'Sign in')}
          {!loading && <ArrowBackRoundedIcon className="ui-flip-ltr" />}
        </button>
      </form>
      <AnimatePresence>
        {signedIn && (
          <motion.div className="ui-welcome" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <motion.span className="ui-welcome-mark" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{isArabic ? 'مرحبًا بعودتك' : 'Welcome back'}</motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
