'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PublicShell from './PublicShell';

export type Category = { id: number; name: string; icon?: string };
export type Governorate = { id: number; name: string };
export type FeaturedOffer = {
  id: number;
  title: string;
  logoUrl: string;
  targetUrl: string;
  sortOrder: number;
};
export type Place = {
  id: number;
  name: string;
  description?: string;
  discount: string;
  baseDiscount?: string;
  hasCustomDiscount?: boolean;
  logoUrl?: string;
  isFeatured?: boolean;
  exclusiveText?: string | null;
  category: { id: number; name: string };
  branches: { id: number; governorate: { id: number; name: string } }[];
  _count?: { branches: number };
};
type ArrivalBannerDesign = {
  designArrivalBannerWidth: number;
  designArrivalBannerHeight: number;
  designArrivalBannerRadius: number;
  designArrivalBannerOpacity: number;
  designArrivalBannerStartColor: string;
  designArrivalBannerEndColor: string;
  designArrivalBannerTextColor: string;
  designArrivalBannerAccentColor: string;
  designArrivalBannerCardColor: string;
  designArrivalLogoWidth: number;
  designArrivalLogoHeight: number;
  designArrivalLogoRadius: number;
};

const DEFAULT_ARRIVAL_DESIGN: ArrivalBannerDesign = {
  designArrivalBannerWidth: 100,
  designArrivalBannerHeight: 0,
  designArrivalBannerRadius: 26,
  designArrivalBannerOpacity: 100,
  designArrivalBannerStartColor: '#070A12',
  designArrivalBannerEndColor: '#5F3F15',
  designArrivalBannerTextColor: '#FFFAF1',
  designArrivalBannerAccentColor: '#D6A64F',
  designArrivalBannerCardColor: '#FFFFFF',
  designArrivalLogoWidth: 116,
  designArrivalLogoHeight: 70,
  designArrivalLogoRadius: 16,
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase() || 'RG';
}

export default function OffersClient({ cardNumber }: { cardNumber: string }) {
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [featured, setFeatured] = React.useState<FeaturedOffer[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [governorates, setGovernorates] = React.useState<Governorate[]>([]);
  const [q, setQ] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [governorateId, setGovernorateId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [arrivalDesign, setArrivalDesign] = React.useState<ArrivalBannerDesign>(DEFAULT_ARRIVAL_DESIGN);

  React.useEffect(() => {
    let active = true;
    fetch('/api/settings', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body?.data) throw new Error(body?.message || 'Unable to load banner design settings');
        if (active) setArrivalDesign({ ...DEFAULT_ARRIVAL_DESIGN, ...body.data });
      })
      .catch(() => {
        if (active) setError((current) => current || 'تعذر تحميل إعدادات بانر الوصول الجديد.');
      });

    return () => { active = false; };
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (categoryId) params.set('categoryId', categoryId);
    if (governorateId) params.set('governorateId', governorateId);

    const [placesRes, catsRes, govsRes, featuredRes] = await Promise.all([
      fetch(`/api/places?${params.toString()}`),
      fetch('/api/categories'),
      fetch('/api/governorates'),
      fetch('/api/new-arrivals', { cache: 'no-store' })
    ]);

    if (placesRes.status === 401) {
      window.location.href = '/login';
      return;
    }

    const placesJson = await placesRes.json();
    if (!placesRes.ok) setError(placesJson.message || 'تعذر تحميل العروض');
    setPlaces(placesJson.data || []);
    setCategories((await catsRes.json()).data || []);
    setGovernorates((await govsRes.json()).data || []);
    const featuredJson = await featuredRes.json().catch(() => ({ data: [] }));
    setFeatured(featuredRes.ok ? (featuredJson.data || []) : []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [categoryId, governorateId]);

  const selectedCategoryName = categories.find((cat) => String(cat.id) === categoryId)?.name;
  const selectedGovernorateName = governorates.find((gov) => String(gov.id) === governorateId)?.name;
  // A marquee group is deliberately wider than the banner. The second identical
  // group begins immediately after it, so translating exactly half the track
  // produces a true loop with no empty end or visible reset.
  const bannerLoop = React.useMemo(() => {
    if (!featured.length) return [] as FeaturedOffer[];
    const minimumCardsPerGroup = 24;
    const repeats = Math.max(1, Math.ceil(minimumCardsPerGroup / featured.length));
    return Array.from({ length: repeats }, () => featured).flat();
  }, [featured]);
  const arrivalBannerStyle = {
    '--rg-arrival-banner-width': `${Math.max(40, Math.min(100, arrivalDesign.designArrivalBannerWidth))}%`,
    '--rg-arrival-banner-height': arrivalDesign.designArrivalBannerHeight > 0
      ? `${Math.min(600, arrivalDesign.designArrivalBannerHeight)}px`
      : 'auto',
    '--rg-arrival-banner-radius': `${Math.max(0, Math.min(60, arrivalDesign.designArrivalBannerRadius))}px`,
    '--rg-arrival-banner-opacity': `${Math.max(0, Math.min(100, arrivalDesign.designArrivalBannerOpacity))}%`,
    '--rg-arrival-banner-start': arrivalDesign.designArrivalBannerStartColor,
    '--rg-arrival-banner-end': arrivalDesign.designArrivalBannerEndColor,
    '--rg-arrival-banner-text': arrivalDesign.designArrivalBannerTextColor,
    '--rg-arrival-banner-accent': arrivalDesign.designArrivalBannerAccentColor,
    '--rg-arrival-banner-card': arrivalDesign.designArrivalBannerCardColor,
    '--rg-arrival-logo-width': `${Math.max(60, Math.min(240, arrivalDesign.designArrivalLogoWidth))}px`,
    '--rg-arrival-logo-height': `${Math.max(40, Math.min(160, arrivalDesign.designArrivalLogoHeight))}px`,
    '--rg-arrival-logo-radius': `${Math.max(0, Math.min(40, arrivalDesign.designArrivalLogoRadius))}px`,
  } as React.CSSProperties;

  return (
    <PublicShell watermarkText={cardNumber} page="offers">
      <Container maxWidth="lg" className="rg-offers-hero rg-offers-page-v21" sx={{ pb: 8 }}>
        <Card className="rg-panel-card rg-offers-header-v21" sx={{ mb: 2.2 }}>
          <CardContent sx={{ p: { xs: 2, md: 2.6 } }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
                  <Box className="rg-section-icon-v21"><LocalOfferRoundedIcon /></Box>
                  <Box>
                    <Typography variant="h4" fontWeight={950}>عروض RG-Card</Typography>
                    <Typography color="text.secondary" fontSize={14}>
                      كل الخصومات في مكان واحد مع فلترة سريعة وواضحة.
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={5}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" useFlexGap>
                  <Chip label={`${places.length} مكان`} color="secondary" sx={{ fontWeight: 950 }} />
                  <Chip label={`${featured.length} في البانر`} variant="outlined" sx={{ fontWeight: 900 }} />
                  <Chip label={selectedCategoryName ? `الفئة: ${selectedCategoryName}` : 'كل الفئات'} variant="outlined" sx={{ fontWeight: 900 }} />
                  <Chip label={selectedGovernorateName ? `المحافظة: ${selectedGovernorateName}` : 'كل المحافظات'} variant="outlined" sx={{ fontWeight: 900 }} />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {featured.length > 0 && (
          <Card className="rg-arrival-banner-v23 rg-arrival-banner-v28 rg-arrival-banner-v29" style={arrivalBannerStyle} sx={{ mb: 2.2 }}>
            <CardContent sx={{ p: 0 }}>
              <Box className="rg-arrival-banner-head-v23 rg-arrival-banner-head-v28">
                <Stack direction="row" spacing={.9} alignItems="center" justifyContent="center">
                  <AutoAwesomeRoundedIcon className="rg-arrival-banner-star-v28" fontSize="small" />
                  <Typography className="rg-arrival-banner-title-v23">NEW ARRIVAL / COMING SOON</Typography>
                  <AutoAwesomeRoundedIcon className="rg-arrival-banner-star-v28" fontSize="small" />
                </Stack>
              </Box>

              <Box className="rg-arrival-banner-window-v23 rg-arrival-banner-window-v29">
                <Box className="rg-arrival-banner-track-v23 rg-arrival-banner-track-v28 rg-arrival-banner-track-v29">
                  {[0, 1].map((groupIndex) => (
                    <Box
                      className="rg-arrival-marquee-group-v28"
                      key={`arrival-group-${groupIndex}`}
                      aria-hidden={groupIndex === 1 || undefined}
                    >
                      {bannerLoop.map((place, index) => (
                        <Box
                          component="a"
                          href={place.targetUrl}
                          target={/^https:\/\//i.test(place.targetUrl) ? '_blank' : undefined}
                          rel={/^https:\/\//i.test(place.targetUrl) ? 'noopener noreferrer' : undefined}
                          key={`${groupIndex}-${place.id}-${index}`}
                          className="rg-arrival-logo-card-v23"
                          aria-label={groupIndex === 0 ? `فتح رابط ${place.title}` : undefined}
                          tabIndex={groupIndex === 1 ? -1 : undefined}
                        >
                          <img src={place.logoUrl} alt={groupIndex === 0 ? place.title : ''} />
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}


        <Card className="rg-panel-card rg-search-panel-v21" sx={{ mb: 2.2 }}>
          <CardContent sx={{ p: { xs: 1.8, md: 2.2 } }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.6 }}>
              <Box className="rg-section-icon-v21"><TuneRoundedIcon /></Box>
              <Box>
                <Typography fontWeight={950}>البحث والفلاتر</Typography>
                <Typography color="text.secondary" fontSize={13}>اختار فئة أو محافظة أو ابحث باسم المكان.</Typography>
              </Box>
            </Stack>

            <Grid container spacing={1.4} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="اسم العرض أو المكان"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
                  InputProps={{ startAdornment: <SearchRoundedIcon sx={{ ml: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>الفئة</InputLabel>
                  <Select label="الفئة" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <MenuItem value="">كل الفئات</MenuItem>
                    {categories.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>المحافظة</InputLabel>
                  <Select label="المحافظة" value={governorateId} onChange={(e) => setGovernorateId(e.target.value)}>
                    <MenuItem value="">كل المحافظات</MenuItem>
                    {governorates.map((gov) => <MenuItem key={gov.id} value={gov.id}>{gov.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={1}>
                <Button fullWidth className="rg-royal-button" variant="contained" onClick={load} sx={{ minHeight: 40 }}>
                  بحث
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box className="rg-category-strip-v21" sx={{ mb: 2.4 }}>
          <Chip label="كل العروض" color={!categoryId ? 'primary' : 'default'} onClick={() => setCategoryId('')} />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              variant={String(cat.id) === categoryId ? 'filled' : 'outlined'}
              color={String(cat.id) === categoryId ? 'primary' : 'default'}
              onClick={() => setCategoryId(String(cat.id))}
            />
          ))}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Card className="rg-panel-card"><CardContent><Typography>جاري تحميل العروض...</Typography></CardContent></Card>
        ) : (
          <Grid container spacing={2.1}>
            {places.map((place) => (
              <Grid item xs={6} sm={4} md={3} key={place.id}>
                <Box component={Link} href={`/places/${place.id}`} className="rg-place-card-link-v23" aria-label={`عرض تفاصيل ${place.name} — ${place.discount}`}>
                  <Card className="rg-panel-card rg-place-card-v23" sx={{ position: 'relative' }}>
                    {place.discount && <span className="rg-place-discount-badge-v41">{place.discount}</span>}
                    <CardContent sx={{ p: { xs: 1.15, sm: 1.5 }, height: '100%' }}>
                      <Stack spacing={0.9} alignItems="center" justifyContent="flex-start" height="100%">
                        <Box className="rg-place-logo-v23">
                          {place.logoUrl ? (
                            <img src={place.logoUrl} alt={place.name} />
                          ) : (
                            <Box className="rg-place-logo-fallback-v23">{getInitials(place.name)}</Box>
                          )}
                        </Box>
                        <Typography className="rg-place-name-v23" fontWeight={950} align="center" noWrap title={place.name}>
                          {place.name}
                        </Typography>
                        {place.category?.name && (
                          <span className="rg-place-category-chip-v41">{place.category.name}</span>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
            ))}
            {!places.length && (
              <Grid item xs={12}>
                <Card className="rg-panel-card"><CardContent><Typography>لا توجد نتائج مطابقة.</Typography></CardContent></Card>
              </Grid>
            )}
          </Grid>
        )}
      </Container>
    </PublicShell>
  );
}
