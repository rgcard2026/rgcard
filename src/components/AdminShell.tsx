'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import PreferenceButtons from './ui/PreferenceButtons';
import { useUiPreferences } from './UiPreferences';

type AdminMe = { id: string; name: string; username: string; role: string; permissions: string[]; can: Record<string, boolean> };
type NavItem = { href: string; label: string; icon: React.ReactNode; permission?: string };

function canAccess(me: AdminMe | null, permission?: string) {
  if (!permission) return true;
  if (!me) return false;
  if (me.role === 'OWNER' || me.permissions.includes('ALL')) return true;
  return Boolean(me.can?.[permission]) || me.permissions.includes(permission);
}

function initials(name?: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join('') || 'A').toUpperCase();
}

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const [me, setMe] = React.useState<AdminMe | null>(null);
  const [loadingMe, setLoadingMe] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname() || '';
  const { language, dir, t } = useUiPreferences();
  const ar = language === 'ar';

  React.useEffect(() => {
    let alive = true;
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) { window.location.href = '/admin/login'; return null; }
        return res.json();
      })
      .then((body) => { if (alive && body?.ok) setMe(body.data); })
      .finally(() => alive && setLoadingMe(false));
    return () => { alive = false; };
  }, []);

  // Close the mobile menu on navigation and with Escape.
  React.useEffect(() => { setMenuOpen(false); }, [pathname]);
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  const groups: { label: string; items: NavItem[] }[] = [
    { label: t('adm_311'), items: [
      { href: '/admin/dashboard', label: t('dashboard'), icon: <DashboardRoundedIcon />, permission: 'DASHBOARD' }
    ] },
    { label: t('adm_312'), items: [
      { href: '/admin/places', label: t('places'), icon: <StorefrontRoundedIcon />, permission: 'PLACES' },
      { href: '/admin/new-arrivals', label: t('arrivals'), icon: <AutoAwesomeRoundedIcon />, permission: 'NEW_ARRIVALS' }
    ] },
    { label: t('adm_313'), items: [
      { href: '/admin/users', label: t('users'), icon: <PeopleAltRoundedIcon />, permission: 'USERS' },
      { href: '/admin/admins', label: t('admins'), icon: <AdminPanelSettingsRoundedIcon />, permission: 'ADMINS' }
    ] },
    { label: t('adm_314'), items: [
      { href: '/admin/logs', label: t('activityLog'), icon: <HistoryRoundedIcon />, permission: 'LOGS' },
      { href: '/admin/security-alerts', label: t('securityAlerts'), icon: <SecurityRoundedIcon />, permission: 'SECURITY' },
      { href: '/admin/exports', label: t('exports'), icon: <FileDownloadRoundedIcon />, permission: 'EXPORTS' }
    ] },
    { label: t('adm_315'), items: [
      { href: '/admin/design', label: t('designStudio'), icon: <PaletteRoundedIcon />, permission: 'DESIGN' },
      { href: '/admin/settings', label: t('accountSecurity'), icon: <SettingsRoundedIcon /> }
    ] }
  ].map((g) => ({ ...g, items: g.items.filter((item) => !loadingMe && canAccess(me, item.permission)) })).filter((g) => g.items.length || loadingMe);

  const isActive = (href: string) => pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(`${href}/`));
  const current = groups.flatMap((g) => g.items).find((item) => isActive(item.href));
  const pageTitle = current?.label || title;

  const sidebar = (
    <>
      <Link href="/admin/dashboard" className="ui-admin-brand">
        <span className="ui-brand-mark" aria-hidden="true" />
        <span>
          <span className="ui-brand-name">RG-Card</span>
          <span className="ui-brand-sub">{t('adm_316')}</span>
        </span>
      </Link>

      <nav className="ui-admin-nav" aria-label={t('adm_317')}>
        {loadingMe && Array.from({ length: 7 }, (_, i) => <span key={i} className="ui-admin-nav-skeleton" />)}
        {groups.map((group) => group.items.length > 0 && (
          <div key={group.label} className="ui-admin-nav-group">
            <span className="ui-admin-nav-label">{group.label}</span>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} className="ui-admin-link" aria-current={active ? 'page' : undefined}>
                  {active && <motion.span layoutId="ui-admin-active" className="ui-admin-link-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="ui-admin-account">
        <span className="ui-admin-avatar" aria-hidden="true">{initials(me?.name)}</span>
        <span className="ui-admin-account-text">
          <strong>{me?.name || '—'}</strong>
          <small>{me ? (me.role === 'OWNER' ? (t('adm_318')) : (t('adm_319'))) : ''}</small>
        </span>
        <button type="button" className="ui-icon-btn" onClick={logout} aria-label={t('logout')} title={t('logout')}>
          <LogoutRoundedIcon className="ui-flip-ltr" />
        </button>
      </div>
    </>
  );

  return (
    <div className="ui-root ui-admin rg-admin-shell" dir={dir}>
      <div className="ui-ambient" aria-hidden="true" />

      <aside className="ui-admin-sidebar">{sidebar}</aside>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div className="ui-admin-scrim" onClick={() => setMenuOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              className="ui-admin-sidebar ui-admin-sidebar--drawer"
              role="dialog"
              aria-modal="true"
              initial={{ x: dir === 'rtl' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: dir === 'rtl' ? '100%' : '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <button type="button" className="ui-icon-btn ui-admin-drawer-close" onClick={() => setMenuOpen(false)} aria-label={t('adm_320')}><CloseRoundedIcon /></button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="ui-admin-main rg-admin-main">
        <header className="ui-admin-topbar">
          <button type="button" className="ui-icon-btn ui-admin-menu" onClick={() => setMenuOpen(true)} aria-label={t('adm_321')}><MenuRoundedIcon /></button>
          <div className="ui-admin-heading">
            <nav className="ui-admin-crumbs" aria-label={t('adm_322')}>
              <Link href="/admin/dashboard">RG-Card</Link>
              <span aria-hidden="true">/</span>
              <span>{pageTitle}</span>
            </nav>
            <h1 className="ui-admin-title">{pageTitle}</h1>
          </div>
          <div className="ui-header-actions"><PreferenceButtons /></div>
        </header>
        <motion.main
          key={pathname}
          className="ui-admin-content rg-admin-content"
          // Opacity only: a transform here would re-anchor the admin's position:fixed side panels.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
