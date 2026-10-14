'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ClientProtection from './ClientProtection';
import PreferenceButtons from './ui/PreferenceButtons';
import { useUiPreferences } from './UiPreferences';
import { useSupportLink } from './ui/useSupportLink';

type PendingLogoNavigation = { href: string; popup: Window | null };

export default function PublicShell({ children, watermarkText, page = 'public' }: { children: React.ReactNode; watermarkText?: string; page?: string }) {
  const [logoLoading, setLogoLoading] = React.useState(false);
  const pendingLogoNavigation = React.useRef<PendingLogoNavigation | null>(null);
  const navigationTimer = React.useRef<number | null>(null);
  const pathname = usePathname() || '';
  const { language, dir, t } = useUiPreferences();
  const isArabic = language === 'ar';

  const support = useSupportLink(watermarkText);

  React.useEffect(() => {
    return () => {
      if (navigationTimer.current) window.clearTimeout(navigationTimer.current);
    };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // Logo links show a short branded loader before navigating (existing behaviour).
  function handleLogoNavigation(event: React.MouseEvent<HTMLElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || logoLoading) return;
    const source = event.target as Element | null;
    const anchor = source?.closest<HTMLAnchorElement>('a[data-rg-logo-transition="true"]');
    if (!anchor) return;
    const href = anchor.href;
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;

    event.preventDefault();
    event.stopPropagation();

    let popup: Window | null = null;
    if (anchor.target === '_blank') {
      popup = window.open('', '_blank');
      try { if (popup) popup.opener = null; } catch { /* browser policy */ }
    }

    pendingLogoNavigation.current = { href, popup };
    setLogoLoading(true);
    navigationTimer.current = window.setTimeout(() => {
      const pending = pendingLogoNavigation.current;
      pendingLogoNavigation.current = null;
      setLogoLoading(false);
      if (!pending) return;
      if (pending.popup && !pending.popup.closed) {
        pending.popup.location.href = pending.href;
        return;
      }
      window.location.assign(pending.href);
    }, 420);
  }

  const nav = [
    { href: '/valid', label: t('mem_33'), icon: <CreditCardRoundedIcon />, match: (p: string) => p === '/valid' || p.startsWith('/member-card') },
    { href: '/offers', label: t('offers'), icon: <LocalOfferRoundedIcon />, match: (p: string) => p.startsWith('/offers') || p.startsWith('/places') }
  ];

  return (
    <div onClickCapture={handleLogoNavigation} className={`ui-root rg-public-shell-${page}`} dir={dir}>
      <div className="ui-ambient" aria-hidden="true" />
      <ClientProtection watermarkText={watermarkText} page={page} />

      <header className="ui-header">
        <div className="ui-container ui-header-inner">
          <Link href="/valid" className="ui-brand" aria-label="RG-Card">
            <span className="ui-brand-mark" aria-hidden="true" />
            <span>
              <span className="ui-brand-name">RG-Card</span>
              <span className="ui-brand-sub">{t('mem_34')}</span>
            </span>
          </Link>

          <nav className="ui-nav" aria-label={t('mem_35')}>
            {nav.map((item) => {
              const active = item.match(pathname);
              return (
                <Link key={item.href} href={item.href} className="ui-nav-link" aria-current={active ? 'page' : undefined}>
                  {active && <motion.span layoutId="ui-nav-pill" className="ui-nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ui-header-actions">
            <PreferenceButtons />
            <a className="ui-icon-btn ui-icon-btn--whatsapp" href={support} target="_blank" rel="noopener noreferrer" aria-label={t('whatsapp')} title={t('whatsapp')}>
              <WhatsAppIcon />
            </a>
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm ui-hide-sm" onClick={logout}>
              <LogoutRoundedIcon className="ui-flip-ltr" />
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>

      <nav className="ui-tabbar" aria-label={t('mem_36')}>
        {nav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link key={item.href} href={item.href} className="ui-tab" aria-current={active ? 'page' : undefined}>
              {active && <motion.span layoutId="ui-tab-pill" className="ui-nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              {item.icon}
              {item.label}
            </Link>
          );
        })}
        <button type="button" className="ui-tab" onClick={logout} style={{ background: 'none', border: 0, font: 'inherit', cursor: 'pointer' }}>
          <LogoutRoundedIcon className="ui-flip-ltr" />
          {t('logout')}
        </button>
      </nav>

      {logoLoading && (
        <div className="ui-loader" role="status" aria-live="polite" aria-label={t('mem_37')}>
          <span className="ui-loader-mark" />
        </div>
      )}
    </div>
  );
}
