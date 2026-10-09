import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import AdminShell from '@/components/AdminShell';
import MemberCard from '@/components/MemberCard';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getCardRenderSettings } from '@/lib/settings';
import { membershipLabel } from '@/lib/card-layout';

export default async function AdminUserCardPage({ params }: { params: { id: string } }) {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      fullName: true,
      idNumber: true,
      cardNumber: true,
      isActive: true,
      lockedAt: true,
      blockedUntil: true,
      validUntil: true,
      isVip: true,
      membershipClass: true,
      createdAt: true
    }
  });
  if (!user) notFound();

  const qrSrc = `/api/admin/users/${user.id}/member-card/qr`;
  const cardLayout = await getCardRenderSettings();
  const pdfHref = `/api/admin/users/${user.id}/member-card/pdf`;
  const classLabel = membershipLabel(user.membershipClass, user.isVip);

  return (
    <AdminShell title={`كارت المستخدم - ${user.fullName}`}>
      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <Card className="rg-panel-card">
            <CardContent sx={{ p: { xs: 2, md: 4 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={950}>معاينة الكارت</Typography>
                  <Typography color="text.secondary">نفس الكارت الذي يراه المستخدم، مع QR و ID generated من بياناته.</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button component={Link} href="/admin/users" variant="outlined" startIcon={<ArrowBackRoundedIcon />}>رجوع</Button>
                  <Button component="a" href={pdfHref} target="_blank" rel="noreferrer" variant="contained" startIcon={<PictureAsPdfRoundedIcon />}>فتح PDF</Button>
                </Stack>
              </Stack>
              <MemberCard cardNumber={user.cardNumber} qrSrc={qrSrc} isVip={user.isVip} membershipClass={user.membershipClass} validUntil={user.validUntil} layout={cardLayout} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card className="rg-panel-card" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h5" fontWeight={950}>{user.fullName}</Typography>
                  <Typography color="text.secondary">بيانات الكارت والعضوية</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip icon={<VerifiedUserRoundedIcon />} label={user.isActive && !user.lockedAt ? 'مفعل' : 'موقوف'} color={user.isActive && !user.lockedAt ? 'success' : 'error'} />
                  <Chip icon={<QrCode2RoundedIcon />} label={`Card: ${user.cardNumber}`} variant="outlined" />
                  {classLabel && <Chip label={classLabel} color="warning" />}
                  <Chip label={`ID: ${user.idNumber}`} variant="outlined" />
                </Stack>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(214,166,79,.08)', border: '1px solid rgba(214,166,79,.22)' }}>
                  <Typography fontWeight={900}>صلاحية العضوية</Typography>
                  <Typography color="text.secondary">{user.validUntil ? new Date(user.validUntil).toLocaleDateString('ar-EG') : 'غير محددة'}</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(15,23,42,.04)', border: '1px solid rgba(15,23,42,.08)' }}>
                  <Typography fontWeight={900}>ملاحظات إدارية</Typography>
                  <Typography color="text.secondary" fontSize={14}>الـ QR والـ ID يتم توليدهم من السيرفر حسب رقم الكارت، ولا يتم الاعتماد على بيانات ثابتة داخل صورة التصميم.</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminShell>
  );
}
