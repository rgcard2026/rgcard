'use client';

import * as React from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import { useUiPreferences } from './UiPreferences';

const exportsList = [
  ['users','المستخدمون','Users','الأسماء وأرقام الهوية والكروت وحالة العضوية.','Names, IDs, cards, and membership status.','/api/admin/exports/users',<PeopleAltRoundedIcon key="i" />],
  ['cards','الكروت','Cards','رقم الكارت والفئة والصلاحية وحالة التفعيل.','Card number, class, validity, and activation status.','/api/admin/exports/cards',<CreditCardRoundedIcon key="i" />],
  ['places','الأماكن','Places','الأماكن والفئات والفروع والعروض المرتبطة.','Places, categories, branches, and linked offers.','/api/admin/exports/places',<StorefrontRoundedIcon key="i" />],
  ['offers','العروض','Offers','كل العروض والخصومات وتاريخ الصلاحية.','All offers, discounts, and validity dates.','/api/admin/exports/offers',<LocalOfferRoundedIcon key="i" />],
  ['branches','الفروع','Branches','الفروع والمحافظات والعناوين وبيانات التواصل.','Branches, governorates, addresses, and contact details.','/api/admin/exports/branches',<AccountTreeRoundedIcon key="i" />],
  ['categories','الفئات','Categories','الفئات وترتيبها وعدد الأماكن في كل فئة.','Categories, ordering, and place counts.','/api/admin/exports/categories',<CategoryRoundedIcon key="i" />],
  ['arrivals','وصل حديثًا / قريبًا','New arrivals / coming soon','اللوجوهات والروابط وحالة الظهور.','Logos, links, and visibility status.','/api/admin/exports/arrivals',<AutoAwesomeRoundedIcon key="i" />]
] as const;

async function parseError(response: Response) { const text = await response.text(); try { return JSON.parse(text)?.message || text; } catch { return text; } }

const FORMATS = ['csv', 'xlsx', 'pdf', 'html', 'json', 'docx'] as const;
type ExportFmt = typeof FORMATS[number];

export default function AdminExportCenterClient() {
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';
  const [busy, setBusy] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [format, setFormat] = React.useState<ExportFmt>('csv');

  async function download(url: string, filename: string) {
    if (busy) return;
    setBusy(url); setMsg('');
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(await parseError(response) || (t('adm_280')));
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = href; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(href);
      setMsg(t('adm_281'));
    } catch (error) { setMsg(error instanceof Error ? error.message : (t('adm_280'))); }
    finally { setBusy(''); }
  }

  function viewPdf() { window.open('/api/admin/users/cards-pdf?includeInactive=1', '_blank', 'noopener,noreferrer'); }
  return <Stack spacing={2}>
    <Card className="rg-panel-card rg-admin-directory-header"><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Stack direction={{ xs:'column', md:'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs:'stretch', md:'center' }}><Box><Typography variant="h5" fontWeight={950}>{t('adm_282')}</Typography><Typography color="text.secondary" fontSize={14} sx={{ mt:.5 }}>{t('adm_283')}</Typography></Box><Stack direction={{ xs:'column', sm:'row' }} spacing={1} className="rg-export-actions"><Button variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={viewPdf}>{t('adm_284')}</Button><Button disabled={Boolean(busy)} className="rg-royal-button" variant="contained" startIcon={busy.includes('cards-pdf') ? <CircularProgress size={18} /> : <DownloadRoundedIcon />} onClick={() => download('/api/admin/users/cards-pdf?includeInactive=1&download=1','rg-card-all-cards.pdf')}>{t('adm_285')}</Button></Stack></Stack></CardContent></Card>
    {msg && <Alert severity={/تعذر|failed|Unable/i.test(msg) ? 'error' : 'success'}>{msg}</Alert>}
    <Card className="rg-panel-card"><CardContent sx={{ p: { xs: 2, sm: 2.5 } }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between"><Box><Typography fontWeight={950}>{t('adm_286')}</Typography><Typography color="text.secondary" fontSize={13}>{t('adm_287')}</Typography></Box><ToggleButtonGroup exclusive size="small" value={format} onChange={(_, value) => value && setFormat(value)} className="rg-export-format-toggle" sx={{ flexWrap: 'wrap' }}>{FORMATS.map((item) => <ToggleButton key={item} value={item} sx={{ textTransform: 'uppercase', fontWeight: 800, px: 1.6 }}>{item === 'xlsx' ? 'Excel' : item === 'docx' ? 'Word' : item}</ToggleButton>)}</ToggleButtonGroup></Stack></CardContent></Card>
    <Alert severity="info">{t('adm_288')}</Alert>
    <Box className="rg-export-grid">
      {exportsList.map(([key,titleAr,titleEn,copyAr,copyEn,href,icon]) => <Card className="rg-panel-card rg-export-card" key={key}><CardContent><Stack spacing={1.5} height="100%"><Box className="rg-export-icon">{icon}</Box><Box sx={{ flex:1 }}><Typography fontWeight={950} variant="h6">{isArabic ? titleAr : titleEn}</Typography><Typography color="text.secondary" fontSize={13} sx={{ mt:.5 }}>{isArabic ? copyAr : copyEn}</Typography></Box><Button disabled={Boolean(busy)} variant="outlined" fullWidth startIcon={busy === `${href}?format=${format}` ? <CircularProgress size={18} /> : <DownloadRoundedIcon />} onClick={() => download(`${href}?format=${format}`,`rg-card-${key}.${format}`)}>{isArabic ? `تصدير ${format.toUpperCase()}` : `Export ${format.toUpperCase()}`}</Button></Stack></CardContent></Card>)}
    </Box>
    <Card className="rg-panel-card rg-export-full-data-card"><CardContent><Stack direction={{ xs:'column', md:'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs:'stretch', md:'center' }}><Box><Typography variant="h6" fontWeight={950}>{t('adm_289')}</Typography><Typography color="text.secondary" fontSize={13}>{t('adm_290')}</Typography></Box><Button disabled={Boolean(busy)} className="rg-royal-button" variant="contained" startIcon={busy === '/api/admin/exports/full-data' ? <CircularProgress size={18} /> : <ArchiveRoundedIcon />} onClick={() => download('/api/admin/exports/full-data','rg-card-full-data.json')}>{t('adm_291')}</Button></Stack></CardContent></Card>
  </Stack>;
}
