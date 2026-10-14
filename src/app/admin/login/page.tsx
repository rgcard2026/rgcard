'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { encryptForLogin } from '@/lib/clientEncryption';
import AuthLayout from '@/components/ui/AuthLayout';
import { useUiPreferences } from '@/components/UiPreferences';

const enableLoginEncryption = process.env.NEXT_PUBLIC_ENABLE_LOGIN_ENCRYPTION === 'true';

export default function AdminLoginPage() {
  const router = useRouter();
  const { language, t } = useUiPreferences();
  const ar = language === 'ar';
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let body: Record<string, string> = { username, password };
    if (enableLoginEncryption) {
      try {
        body = { payload: await encryptForLogin({ username, password }) };
      } catch {
        setLoading(false);
        return setError(t('adm_349'));
      }
    }

    try {
      const res = await fetch('/api/auth/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const responseBody = await res.json();
      if (!res.ok) {
        setLoading(false);
        return setError(responseBody.message || (t('adm_350')));
      }
      router.push(responseBody.redirectTo || '/admin/dashboard');
    } catch {
      setLoading(false);
      setError(t('adm_351'));
    }
  }

  return (
    <AuthLayout
      title={t('adm_352')}
      subtitle={t('adm_353')}
      brandSubtitle={t('adm_354')}
    >
      <form className="ui-auth-form" onSubmit={submit}>
        {error && <div className="ui-alert ui-alert--error" role="alert"><ErrorOutlineRoundedIcon />{error}</div>}
        {!enableLoginEncryption && process.env.NODE_ENV === 'development' && (
          <div className="ui-hint">{t('adm_355')}</div>
        )}
        <div className="ui-field">
          <label className="ui-label" htmlFor="admin-user">{t('adm_356')}</label>
          <div className="ui-input-wrap">
            <AdminPanelSettingsRoundedIcon />
            <input id="admin-user" type="text" className="ui-input" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="admin-password">{t('adm_71')}</label>
          <div className="ui-input-wrap">
            <LockRoundedIcon />
            <input id="admin-password" className="ui-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <button type="button" className="ui-input-action" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
            </button>
          </div>
        </div>
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? (t('adm_357')) : (t('adm_358'))}
          {!loading && <ArrowBackRoundedIcon className="ui-flip-ltr" />}
        </button>
      </form>
    </AuthLayout>
  );
}
