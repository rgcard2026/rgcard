import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

import PublicShell from '@/components/PublicShell';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import BranchSelector from '@/components/BranchSelector';

export default async function PlaceDetails({ params }: { params: { id: string } }) {
  const session = await getSession('user');
  if (!session) redirect('/login');

  const place = await prisma.place.findFirst({
    where: { id: Number(params.id), isActive: true },
    include: {
      category: true,
      offers: true,
      branches: { include: { governorate: true }, orderBy: { id: 'asc' } },
      governorates: { include: { governorate: true } },
      userDiscounts: { where: { userId: session.sub }, take: 1 }
    }
  });
  if (!place) notFound();
  const branchGovernorates = Array.from(new Map(place.branches.map((branch: any) => [branch.governorate.id, branch.governorate])).values());
  const assignedGovernorates = place.governorates.map((assignment: any) => assignment.governorate);
  const govs = place.governoratesConfigured ? assignedGovernorates : branchGovernorates;
  const customDiscount = place.userDiscounts[0];
  const effectiveDiscount = customDiscount?.discountText || place.discount;

  return (
    <PublicShell watermarkText={session.cardNumber} page={`place-${place.id}`}>
      <Container maxWidth="lg" className="rg-valid-card" sx={{ pb: { xs: 4, md: 8 }, px: { xs: 1.25, sm: 2 } }}>
        <Button component={Link} href="/offers" sx={{ mb: 2, color: 'var(--rg-text)', borderColor: 'var(--rg-accent-border)' }} variant="outlined" startIcon={<ArrowBackRoundedIcon />}>رجوع للأماكن</Button>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h3" fontWeight={950} sx={{ fontSize: { xs: '1.8rem', sm: '2.55rem' }, wordBreak: 'break-word' }}>{place.name}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.8 }}>{place.description}</Typography>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card className="rg-panel-card">
              <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Box className="rg-place-details-logo-frame">
                  {place.logoUrl ? <Box component="img" src={place.logoUrl} alt={place.name} className="rg-place-details-logo-image" /> : <Typography variant="h4" fontWeight={900}>{place.name}</Typography>}
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 3 }} flexWrap="wrap">
                  <Chip label={effectiveDiscount} color={customDiscount ? "success" : "secondary"} sx={{ fontWeight: 900 }} />
                  {customDiscount && <Chip label="خصم خاص لهذا المستخدم" color="success" variant="outlined" sx={{ fontWeight: 900 }} />}
                  <Chip label={place.category.name} variant="outlined" />
                </Stack>
                <Typography sx={{ mt: 3 }} color="text.secondary">{place.description || 'تفاصيل العرض متاحة لأعضاء RG-Card.'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card className="rg-panel-card">
              <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h5" fontWeight={900}>الفروع المتاحة</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>اختر المحافظة ثم راجع الفروع والعناوين.</Typography>
                <BranchSelector governorates={govs} branches={place.branches} />
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={900}>العروض الحالية</Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {place.offers.map((offer: any) => (
                    <Box key={offer.id} sx={{ p: 2, bgcolor: 'color-mix(in srgb, var(--rg-accent-border) 13%, transparent)', borderRadius: 3 }}>
                      <Typography fontWeight={900}>{offer.title}</Typography>
                      <Typography color="text.secondary" fontSize={14}>{customDiscount ? effectiveDiscount : offer.discountText} - {offer.description}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </PublicShell>
  );
}
