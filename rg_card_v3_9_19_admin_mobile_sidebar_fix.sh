#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "src/components" ]; then
  echo "[-] Run this script from the project root: rg_card_next_api"
  echo "    cd \"/root/Desktop/RG Card/rg_card_next_api\""
  exit 1
fi

mkdir -p .patch-backups
if [ -f "src/components/AdminShell.tsx" ]; then
  cp "src/components/AdminShell.tsx" ".patch-backups/AdminShell.before-v3.9.19.$(date +%Y%m%d-%H%M%S).tsx"
fi

python3 - <<'PY'
from pathlib import Path
import json
p = Path('package.json')
pkg = json.loads(p.read_text())
pkg['version'] = '3.9.19'
p.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + '\n')
print('[+] package.json version set to 3.9.19')
PY

cat > src/components/AdminShell.tsx <<'TSX'
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, CircularProgress, Container, Drawer, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';

const drawerWidth = 278;

type AdminMe = {
  id: string;
  name: string;
  username: string;
  role: string;
  permissions: string[];
  can: Record<string, boolean>;
};

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
  const isMobile = useMediaQuery('(max-width:900px)', { noSsr: true });

  React.useEffect(() => {
    let alive = true;
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return null;
        }
        return res.json();
      })
      .then((body) => {
        if (!alive || !body?.ok) return;
        setMe(body.data);
      })
      .finally(() => alive && setLoadingMe(false));
    return () => { alive = false; };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  const nav = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <DashboardRoundedIcon />, permission: 'DASHBOARD' },
    { href: '/admin/places', label: 'الأماكن والعروض', icon: <StorefrontRoundedIcon />, permission: 'PLACES' },
    { href: '/admin/users', label: 'المستخدمين والكروت', icon: <PeopleAltRoundedIcon />, permission: 'USERS' },
    { href: '/admin/admins', label: 'Admins & صلاحيات', icon: <AdminPanelSettingsRoundedIcon />, permission: 'ADMINS' },
    { href: '/admin/logs', label: 'Activity Logs', icon: <HistoryRoundedIcon />, permission: 'LOGS' },
    { href: '/admin/settings', label: 'إعدادات الحساب', icon: <SettingsRoundedIcon /> }
  ].filter((item) => !loadingMe && canAccess(me, item.permission));

  const drawerContent = (
    <Box sx={{ width: drawerWidth, maxWidth: '86vw', minHeight: '100%', p: 2.2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
        <Box className="rg-mini-crown">♛</Box>
        <Box>
          <Typography fontWeight={950}>RG-Card</Typography>
          <Typography fontSize={12} sx={{ color: 'rgba(255,255,255,.62)' }}>لوحة التحكم</Typography>
        </Box>
      </Stack>
      <Stack spacing={1.1}>
        {loadingMe ? (
          <Stack direction="row" alignItems="center" justifyContent="center" sx={{ py: 2 }}>
            <CircularProgress size={22} sx={{ color: '#d6a64f' }} />
          </Stack>
        ) : nav.map((item) => (
          <Button
            key={item.href}
            component={Link}
            href={item.href}
            startIcon={item.icon}
            className="rg-admin-nav-button"
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Button>
        ))}
        <Button onClick={logout} startIcon={<LogoutRoundedIcon />} className="rg-admin-nav-button" sx={{ mt: 2, border: '1px solid rgba(255,255,255,.16)' }}>تسجيل الخروج</Button>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7f3eb', overflowX: 'hidden' }}>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        anchor="right"
        open={!isMobile || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: drawerWidth,
            maxWidth: '86vw',
            border: 0,
            bgcolor: '#07090d',
            color: 'white',
            backgroundImage: 'radial-gradient(circle at top right, rgba(214,166,79,.28), transparent 32%), linear-gradient(180deg, #07090d, #161a22)',
            boxShadow: isMobile ? '0 24px 80px rgba(0,0,0,.45)' : 'none'
          }
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ mr: { xs: 0, md: `${drawerWidth}px` }, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` } }}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'rgba(255,250,240,.88)', backdropFilter: 'blur(22px)', borderBottom: '1px solid rgba(15,23,42,.08)' }}>
          <Container maxWidth="lg" sx={{ py: { xs: 1.3, md: 2.2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={950} sx={{ lineHeight: 1.25, wordBreak: 'break-word' }}>{title}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: { xs: 12, sm: 14 } }}>إدارة بيانات RG-Card من مكان واحد</Typography>
              </Box>
              {isMobile && (
                <IconButton
                  onClick={() => setMobileOpen(true)}
                  aria-label="فتح القائمة"
                  sx={{
                    width: 44,
                    height: 44,
                    flex: '0 0 auto',
                    bgcolor: '#0b1220',
                    color: '#fff',
                    borderRadius: 3,
                    boxShadow: '0 10px 24px rgba(15,23,42,.18)',
                    '&:hover': { bgcolor: '#111827' }
                  }}
                >
                  <MenuRoundedIcon />
                </IconButton>
              )}
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.2, sm: 2, md: 3 } }}>{children}</Container>
      </Box>
    </Box>
  );
}
TSX

echo "[+] Admin mobile sidebar fixed."
echo "[+] On mobile the menu is now a drawer opened by the black menu button, not a permanent sidebar."
echo "[+] Backup saved under .patch-backups/"
echo "[+] Now run: rm -rf .next && npm run build && npm run dev -- -H 0.0.0.0 -p 3000"
