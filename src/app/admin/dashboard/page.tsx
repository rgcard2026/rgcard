import { redirect } from 'next/navigation';
import { Alert, Box, Card, CardContent, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import AdminShell from '@/components/AdminShell';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { adminHasPermission, firstAllowedAdminPath } from '@/lib/admin-auth';
import AdminDashboardExportActions from '@/components/AdminDashboardExportActions';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default async function AdminDashboard() {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  if (!(await adminHasPermission(session, 'DASHBOARD'))) redirect(await firstAllowedAdminPath(session));
  const canExport = await adminHasPermission(session, 'EXPORTS');

  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceDay = startOfDay(since);

  const [users, activeUsers, places, branches, categories, loginLogs, bruteForceAlerts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.place.count(),
    prisma.branch.count(),
    prisma.category.count(),
    prisma.auditLog.findMany({
      where: {
        action: { in: ['USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILED', 'USER_LOGIN_BLOCKED'] },
        createdAt: { gte: sinceDay }
      },
      select: { action: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.auditLog.findMany({
      where: { action: 'BRUTE_FORCE_ALERT' },
      include: { user: { select: { fullName: true, idNumber: true, cardNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sinceDay);
    d.setDate(sinceDay.getDate() + i);
    return d;
  });

  const loginSeries = days.map((day) => {
    const key = day.toISOString().slice(0, 10);
    const dayLogs = loginLogs.filter((log) => log.createdAt.toISOString().slice(0, 10) === key);
    const success = dayLogs.filter((log) => log.action === 'USER_LOGIN_SUCCESS').length;
    const failed = dayLogs.filter((log) => log.action !== 'USER_LOGIN_SUCCESS').length;
    return {
      key,
      label: day.toLocaleDateString('ar-EG', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      success,
      failed,
      total: success + failed
    };
  });
  const maxTotal = Math.max(...loginSeries.map((d) => d.total), 1);

  const cards = [
    { label: 'إجمالي المستخدمين', value: users, icon: <PeopleAltRoundedIcon />, tone: 'primary' },
    { label: 'كروت مفعلة', value: activeUsers, icon: <PeopleAltRoundedIcon />, tone: 'success' },
    { label: 'الأماكن والعروض', value: places, icon: <StorefrontRoundedIcon />, tone: 'secondary' },
    { label: 'الفروع', value: branches, icon: <AccountTreeRoundedIcon />, tone: 'info' },
    { label: 'الفئات', value: categories, icon: <CategoryRoundedIcon />, tone: 'warning' },
    { label: 'Security Alerts', value: bruteForceAlerts.length, icon: <SecurityRoundedIcon />, tone: 'error' }
  ];

  return (
    <AdminShell title="Dashboard">
      <Box className="rg-admin-hero" sx={{ mb: 2, p: { xs: 2, sm: 3.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={950} sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' }, wordBreak: 'break-word' }}>مرحبًا، {session.name}</Typography>
            <Typography sx={{ opacity: .82 }}>متابعة العروض، المستخدمين، ومحاولات الدخول من مكان واحد.</Typography>
          </Box>
          <Chip icon={<SecurityRoundedIcon />} label={`${bruteForceAlerts.length} تنبيه أمني حديث`} sx={{ bgcolor: 'rgba(255,255,255,.18)', color: 'white', fontWeight: 900, maxWidth: '100%' }} />
        </Stack>
      </Box>

      {bruteForceAlerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 4 }}>
          تم رصد محاولات دخول مشبوهة. راجع صندوق Security Alerts أسفل الصفحة لمعرفة الحسابات المتأثرة.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.label}>
            <Card className="rg-stat-card">
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <div>
                    <Typography color="text.secondary" fontWeight={800}>{card.label}</Typography>
                    <Typography variant="h3" fontWeight={950}>{card.value}</Typography>
                  </div>
                  <Box className={`rg-stat-icon rg-stat-${card.tone}`}>{card.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {canExport && <Box sx={{ mt: 3 }}><AdminDashboardExportActions /></Box>}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Card className="rg-panel-card">
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <LoginRoundedIcon color="primary" />
                <Typography variant="h5" fontWeight={950}>عدد عمليات التسجيل والدخول</Typography>
              </Stack>
              <Stack spacing={2.2}>
                {loginSeries.map((day) => (
                  <Box key={day.key}>
                    <Stack direction="row" justifyContent="space-between" mb={.8}>
                      <Typography fontWeight={900}>{day.label}</Typography>
                      <Typography color="text.secondary">نجاح {day.success} / فشل {day.failed}</Typography>
                    </Stack>
                    <Box sx={{ position: 'relative' }}>
                      <LinearProgress variant="determinate" value={(day.total / maxTotal) * 100} sx={{ height: 12, borderRadius: 99, bgcolor: 'rgba(15,23,42,.08)' }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card className="rg-panel-card">
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <SecurityRoundedIcon color="error" />
                <Typography variant="h5" fontWeight={950}>Security Alerts</Typography>
              </Stack>
              <Stack spacing={1.5}>
                {bruteForceAlerts.map((alert) => (
                  <Box key={alert.id} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.18)' }}>
                    <Typography fontWeight={950}>{alert.user?.fullName || 'Unknown User'}</Typography>
                    <Typography color="text.secondary" fontSize={13}>Card: {alert.user?.cardNumber || '-'} | ID: {alert.user?.idNumber || '-'}</Typography>
                    <Typography color="text.secondary" fontSize={12}>{alert.createdAt.toLocaleString('ar-EG')}</Typography>
                  </Box>
                ))}
                {!bruteForceAlerts.length && <Typography color="text.secondary">لا توجد تنبيهات أمنية حديثة.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminShell>
  );
}
