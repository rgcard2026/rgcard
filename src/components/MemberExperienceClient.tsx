'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import PublicShell from './PublicShell';
import MemberCard from './MemberCard';
import { useUiPreferences } from './UiPreferences';
import type { CardRenderLayout } from '@/lib/card-layout';

type Props = {
  name: string;
  cardNumber: string;
  isVip: boolean;
  membershipClass?: string | null;
  validUntil?: string | null;
  classLabel?: string | null;
  layout: CardRenderLayout;
};

export default function MemberExperienceClient({ name, cardNumber, isVip, membershipClass, validUntil, classLabel, layout }: Props) {
  const [progress, setProgress] = React.useState(0);
  const storyRef = React.useRef<HTMLElement | null>(null);
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';

  React.useEffect(() => {
    const updateProgress = () => {
      const story = storyRef.current;
      if (!story) return;
      const viewport = Math.max(window.innerHeight, 1);
      const rect = story.getBoundingClientRect();
      const availableScroll = Math.max(story.offsetHeight - viewport * .72, 1);
      const travelled = Math.max(0, -rect.top);
      setProgress(Math.min(1, travelled / availableScroll));
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  const cardTransform = `perspective(1500px) rotateY(${progress * 180}deg) rotateX(${Math.sin(progress * Math.PI) * -3.5}deg) translateY(${Math.sin(progress * Math.PI) * -8}px)`;

  return (
    <PublicShell watermarkText={cardNumber} page="valid">
      <main className="rg-member-experience">
        <section ref={storyRef} className="rg-card-story">
          <Container maxWidth="lg" className="rg-card-story-grid">
            <Box className="rg-card-story-copy">
              <Typography component="h1" className="rg-story-title">{isArabic ? `مرحبًا، ${name}` : `Welcome, ${name}`}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4} sx={{ mt: 3 }}>
                <Button component={Link} href="/offers" className="rg-royal-button" variant="contained" startIcon={<LocalOfferRoundedIcon />}>{t('viewOffers')}</Button>
                <Button component={Link} href="/member-card-pdf" variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} className="rg-story-secondary-button">{t('downloadPdf')}</Button>
              </Stack>
            </Box>
            <Box className="rg-card-stage-wrap" aria-label={t('memberCard')}>
              <Box className="rg-card-stage" style={{ transform: cardTransform }}>
                <Box className="rg-card-face rg-card-face-front">
                  <MemberCard cardNumber={cardNumber} isVip={isVip} membershipClass={membershipClass} validUntil={validUntil || null} layout={layout} />
                </Box>
                <Box className="rg-card-face rg-card-face-back">
                  <Card className="rg-card-back-panel">
                    <CardContent>
                      <Typography className="rg-card-back-brand">RG-Card</Typography>
                      <Box className="rg-card-back-stripe" />
                      <Stack spacing={.7} sx={{ mt: 3 }}>
                        <Typography fontWeight={900}>{isArabic ? 'رقم الكارت' : 'Card number'}</Typography>
                        <Typography className="rg-card-back-number">{cardNumber}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </Box>
          </Container>
        </section>
        <section className="rg-member-next-section">
          <Container maxWidth="lg">
            <Card className="rg-panel-card rg-member-next-card">
              <CardContent sx={{ p: { xs: 2.4, sm: 3.5 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight={950}>{isArabic ? 'كل مزايا العضوية في مكان واحد' : 'All membership benefits in one place'}</Typography>
                    <Typography color="text.secondary" sx={{ mt: .7 }}>{isArabic ? 'ابحث في الأماكن، راجع الفروع، واستخدم خصمك في أي وقت.' : 'Search places, review branches, and use your discount whenever you need it.'}</Typography>
                  </Box>
                  <Button component={Link} href="/offers" variant="contained" className="rg-royal-button" endIcon={<LocalOfferRoundedIcon />}>{t('offers')}</Button>
                </Stack>
              </CardContent>
            </Card>
          </Container>
        </section>
      </main>
    </PublicShell>
  );
}
