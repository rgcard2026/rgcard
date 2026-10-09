'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Button, CircularProgress, Container, Drawer, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import UiControls from './UiControls';
import { useUiPreferences } from './UiPreferences';

const drawerWidth = 278;

type AdminMe = { id: string; name: string; username: string; role: string; permissions: string[]; can: Record<string, boolean> };
function canAccess(me: AdminMe | null, permission?: string) {
  if (!permission) return true;
  if (!me) return false;
  if (me.role === 'OWNER' || me.permissions.includes('ALL')) return true;
  return Boolean(me.can?.[permission]) || me.permissions.includes(permission);
}

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const [me, setMe] = React.useState<AdminMe | null>(null);
  const [loadingMe, setLoadingMe] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isMobile = useMediaQuery('(max-width:1099px)', { noSsr: true });
  const pathname = usePathname();
  const { language, dir, t } = useUiPreferences();

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

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  const nav = [
    { href: '/admin/dashboard', label: t('dashboard'), icon: <DashboardRoundedIcon />, permission: 'DASHBOARD' },
    { href: '/admin/places', label: t('places'), icon: <StorefrontRoundedIcon />, permission: 'PLACES' },
    { href: '/admin/new-arrivals', label: t('arrivals'), icon: <AutoAwesomeRoundedIcon />, permission: 'PLACES' },
    { href: '/admin/users', label: t('users'), icon: <PeopleAltRoundedIcon />, permission: 'USERS' },
    { href: '/admin/admins', label: t('admins'), icon: <AdminPanelSettingsRoundedIcon />, permission: 'ADMINS' },
    { href: '/admin/logs', label: t('activityLog'), icon: <HistoryRoundedIcon />, permission: 'LOGS' },
    { href: '/admin/security-alerts', label: t('securityAlerts'), icon: <SecurityRoundedIcon />, permission: 'LOGS' },
    { href: '/admin/exports', label: t('exports'), icon: <FileDownloadRoundedIcon />, permission: 'EXPORTS' },
    { href: '/admin/design', label: t('designStudio'), icon: <PaletteRoundedIcon />, permission: 'SETTINGS' },
    { href: '/admin/card-design', label: t('cardDesign'), icon: <CreditCardRoundedIcon />, permission: 'SETTINGS' },
    { href: '/admin/card-settings', label: t('appCardSettings'), icon: <TuneRoundedIcon />, permission: 'SETTINGS' },
    { href: '/admin/settings', label: t('accountSecurity'), icon: <SettingsRoundedIcon /> }
  ].filter((item) => !loadingMe && canAccess(me, item.permission));

  const pageTitle = nav.find((item) => pathname === item.href)?.label || title;
  const drawerAnchor = dir === 'rtl' ? 'right' : 'left';
  const drawerContent = (
    <Box sx={{ width: drawerWidth, maxWidth: '86vw', minHeight: '100%', p: 2.2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
        <Box className="rg-mini-crown">♛</Box>
        <Box>
          <Typography fontWeight={950}>RG-Card</Typography>
          <Typography fontSize={12} sx={{ color: 'rgba(255,255,255,.66)' }}>{t('dashboard')}</Typography>
        </Box>
      </Stack>
      <Stack spacing={1.1}>
        {loadingMe ? <Stack direction="row" alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={22} sx={{ color: '#d6a64f' }} /></Stack> : nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(`${item.href}/`));
          return <Button key={item.href} component={Link} href={item.href} startIcon={item.icon} className={`rg-admin-nav-button ${active ? 'rg-admin-nav-active' : ''}`} onClick={() => setMobileOpen(false)}>{item.label}</Button>;
        })}
        <Button onClick={logout} startIcon={<LogoutRoundedIcon />} className="rg-admin-nav-button rg-admin-logout" sx={{ mt: 2 }}>{t('logout')}</Button>
      </Stack>
    </Box>
  );

  return (
    <Box className={`rg-admin-shell rg-admin-shell-${dir}`} sx={{ minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      <Drawer variant={isMobile ? 'temporary' : 'permanent'} anchor={drawerAnchor} open={!isMobile || mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
        PaperProps={{ className: 'rg-admin-sidebar-paper', sx: { width: drawerWidth, maxWidth: '86vw', border: 0, bgcolor: 'var(--rg-brand-blue)', color: 'white', backgroundImage: 'var(--rg-brand-gradient)', boxShadow: isMobile ? '0 24px 80px rgba(0,0,0,.45)' : 'none' } }}>
        {drawerContent}
      </Drawer>
      <Box className={`rg-admin-main rg-admin-main-${dir} ${isMobile ? 'rg-admin-main-mobile' : 'rg-admin-main-desktop'}`} sx={{ width: '100%', minWidth: 0 }}>
        <Box className="rg-admin-topbar" sx={{ position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(22px)', borderBottom: '1px solid rgba(15,23,42,.08)' }}>
          <Container maxWidth={false} sx={{ py: { xs: 1.1, md: 2.0 }, px: { xs: 1.25, sm: 2.5, md: 3.5 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={950} sx={{ lineHeight: 1.25, wordBreak: 'break-word' }}>{pageTitle}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: { xs: 12, sm: 14 } }}>{t('adminSubtitle')}</Typography>
              </Box>
              <Stack direction="row" spacing={.5} alignItems="center">
                <UiControls compact />
                {isMobile && <IconButton onClick={() => setMobileOpen(true)} aria-label={language === 'ar' ? 'فتح القائمة' : 'Open menu'} className="rg-admin-menu-button"><MenuRoundedIcon /></IconButton>}
              </Stack>
            </Stack>
          </Container>
        </Box>
        <Box className="rg-admin-breadcrumbs" aria-label={language === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
          <Container maxWidth={false} sx={{ px: { xs: 1.25, sm: 2.5, md: 3.5 } }}>
            <Typography component="div" fontSize={12} color="text.secondary"><Link href="/admin/dashboard">{t('dashboard')}</Link><span aria-hidden="true"> / </span><strong>{pageTitle}</strong></Typography>
          </Container>
        </Box>
        <Container maxWidth={false} className="rg-admin-content" sx={{ py: { xs: 1.5, sm: 2.2, md: 4 }, px: { xs: 1, sm: 2, md: 3.5 } }}>{children}</Container>
      </Box>
    </Box>
  );
}
