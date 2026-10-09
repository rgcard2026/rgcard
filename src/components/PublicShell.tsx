'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppBar, Box, Button, Container, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ClientProtection from './ClientProtection';
import UiControls from './UiControls';
import { useUiPreferences } from './UiPreferences';

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

type PendingLogoNavigation = { href: string; popup: Window | null };

export default function PublicShell({ children, watermarkText, page = 'public' }: { children: React.ReactNode; watermarkText?: string; page?: string }) {
  const [whatsappNumber, setWhatsappNumber] = React.useState(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000033494');
  const [whatsappMessage, setWhatsappMessage] = React.useState('مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}');
  const [logoLoading, setLogoLoading] = React.useState(false);
  const pendingLogoNavigation = React.useRef<PendingLogoNavigation | null>(null);
  const navigationTimer = React.useRef<number | null>(null);
  const { language, t } = useUiPreferences();

  React.useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((body) => {
      if (body?.data?.whatsappNumber) setWhatsappNumber(body.data.whatsappNumber);
      if (body?.data?.whatsappMessage) setWhatsappMessage(body.data.whatsappMessage);
    }).catch(() => null);
    return () => {
      if (navigationTimer.current) window.clearTimeout(navigationTimer.current);
    };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

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
    }, 460);
  }

  return (
    <Box onClickCapture={handleLogoNavigation} className={`rg-public-shell rg-public-shell-${page}`} sx={{ minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
      <ClientProtection watermarkText={watermarkText} page={page} />
      <AppBar position="sticky" elevation={0} className="rg-topbar">
        <ToolbarContainer>
          <Link href="/valid" aria-label="RG-Card">
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box className="rg-mini-crown">♛</Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography fontWeight={950} fontSize={19} lineHeight={1}>RG-Card</Typography>
                <Typography color="text.secondary" fontSize={12}>{language === 'ar' ? 'امتيازات وعروض مختارة' : 'Royal privileges & offers'}</Typography>
              </Box>
            </Stack>
          </Link>
          <Box sx={{ flex: 1 }} />
          <UiControls compact />
          <Tooltip title={t('whatsapp')}>
            <IconButton component="a" href={whatsappUrl(watermarkText, whatsappNumber, whatsappMessage)} target="_blank" rel="noopener noreferrer" color="success" aria-label={t('whatsapp')}>
              <WhatsAppIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('offers')}>
            <Button component={Link} href="/offers" startIcon={<LocalOfferRoundedIcon />} variant="text" className="rg-nav-button rg-mobile-action">
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('offers')}</Box>
            </Button>
          </Tooltip>
          <Tooltip title={t('logout')}>
            <Button onClick={logout} startIcon={<LogoutRoundedIcon />} variant="outlined" color="inherit" className="rg-logout-button rg-mobile-action">
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('logout')}</Box>
            </Button>
          </Tooltip>
        </ToolbarContainer>
      </AppBar>
      <Box className="rg-royal-banner">
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography className="rg-banner-kicker">RG-Card Royal Membership</Typography>
              <Typography className="rg-banner-title">{language === 'ar' ? 'خصومات مختارة بتجربة راقية' : 'Curated privileges, delivered beautifully'}</Typography>
            </Box>
            <Typography className="rg-banner-copy">{language === 'ar' ? 'استخدم عضويتك للوصول للعروض الحصرية والفروع المعتمدة.' : 'Use your membership to access exclusive offers and verified branches.'}</Typography>
          </Stack>
        </Container>
      </Box>
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
      {logoLoading && (
        <Box className="rg-logo-route-loader" role="status" aria-live="polite" aria-label={language === 'ar' ? 'جاري فتح التفاصيل' : 'Opening details'}>
          <Box className="rg-logo-route-loader-card">
            <Box className="rg-logo-route-loader-ring"><AutoAwesomeRoundedIcon /></Box>
            <Typography className="rg-logo-route-loader-text">{language === 'ar' ? 'جاري تحميل التفاصيل...' : 'Loading details...'}</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function ToolbarContainer({ children }: { children: React.ReactNode }) {
  return (
    <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', minHeight: { xs: 58, sm: 68 }, gap: { xs: .45, sm: 1 }, px: { xs: 1.25, sm: 2 } }}>
      {children}
    </Container>
  );
}
