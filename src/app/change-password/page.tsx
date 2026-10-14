'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import AuthLayout from '@/components/ui/AuthLayout';
import { useUiPreferences } from '@/components/UiPreferences';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) return setMsg(body.message || (t('mem_41')));
    router.push(body.redirectTo || '/valid');
  }

  const toggle = (
    <button type="button" className="ui-input-action" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
    </button>
  );

  return (
    <AuthLayout
      title={t('mem_42')}
      subtitle={t('mem_43')}
    >
      <form className="ui-auth-form" onSubmit={submit}>
        {msg && <div className="ui-alert ui-alert--error" role="alert"><ErrorOutlineRoundedIcon />{msg}</div>}
        <div className="ui-field">
          <label className="ui-label" htmlFor="cp-current">{t('mem_44')}</label>
          <div className="ui-input-wrap">
            <LockRoundedIcon />
            <input id="cp-current" className="ui-input" type={show ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            {toggle}
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="cp-new">{t('mem_45')}</label>
          <div className="ui-input-wrap">
            <LockResetRoundedIcon />
            <input id="cp-new" className="ui-input" type={show ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <span className="ui-hint">{t('mem_46')}</span>
        </div>
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={loading}>
          {loading ? (t('mem_47')) : (t('mem_48'))}
        </button>
      </form>
    </AuthLayout>
  );
}
