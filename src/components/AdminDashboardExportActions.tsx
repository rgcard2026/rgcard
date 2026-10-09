'use client';

import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import Link from 'next/link';
import { useUiPreferences } from './UiPreferences';

export default function AdminDashboardExportActions() {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';

  return (
    <Card className="rg-panel-card rg-dashboard-export-card">
      <CardContent sx={{ p: { xs: 2, sm: 2.7 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={950}>{isArabic ? 'الكروت والتصدير' : 'Cards & exports'}</Typography>
            <Typography color="text.secondary" fontSize={13}>{isArabic ? 'عرض كل كروت المستخدمين في ملف PDF أو تصدير بيانات المستخدمين والكروت والأماكن والعروض.' : 'View every member card in one PDF or export users, cards, places, and offers.'}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button component="a" href="/api/admin/users/cards-pdf?includeInactive=1" target="_blank" variant="outlined" startIcon={<PictureAsPdfRoundedIcon />}>{isArabic ? 'عرض PDF' : 'View PDF'}</Button>
            <Button component={Link} href="/admin/exports" variant="contained" className="rg-royal-button" startIcon={<DownloadRoundedIcon />}>{isArabic ? 'مركز التصدير' : 'Export center'}</Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
