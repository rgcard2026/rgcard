'use client';

import * as React from 'react';
import AdminTextField from '@/components/AdminTextField';
import AdminActionToggle from '@/components/AdminActionToggle';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, Divider, Drawer, FormControlLabel, Grid, IconButton, Pagination, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import { useUiPreferences } from './UiPreferences';

type BannerItem = { id: number; title: string; logoUrl: string; targetUrl: string; isActive: boolean; sortOrder: number };
type Draft = Pick<BannerItem, 'title' | 'targetUrl' | 'isActive'>;
async function readJson(response: Response) { const text = await response.text(); try { return JSON.parse(text); } catch { return { ok: false, message: text || 'Unable to read server response' }; } }
function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RG'; }

export default function AdminNewArrivalsClient() {
  const { language, t } = useUiPreferences(); const isArabic = language === 'ar';
  const [items, setItems] = React.useState<BannerItem[]>([]);
  const [msg, setMsg] = React.useState('');
  const [selected, setSelected] = React.useState<BannerItem | null>(null);
  const [draft, setDraft] = React.useState<Draft>({ title: '', targetUrl: '', isActive: true });
  const [panel, setPanel] = React.useState<'create' | 'edit' | null>(null);
  const [newLogo, setNewLogo] = React.useState<File | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [page, setPage] = React.useState(1); const pageSize = 12;

  const load = React.useCallback(async () => {
    const res = await fetch('/api/admin/new-arrivals', { cache: 'no-store' }); const body = await readJson(res);
    if (!res.ok) setMsg(body.message || (isArabic ? 'تعذر تحميل العناصر' : 'Unable to load items'));
    setItems(body.data || []);
  }, [isArabic]);
  React.useEffect(() => { load(); }, [load]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const shown = items.slice((page - 1) * pageSize, page * pageSize);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  function openEdit(item: BannerItem) { setSelected(item); setDraft({ title: item.title, targetUrl: item.targetUrl, isActive: item.isActive }); setPanel('edit'); }
  async function uploadLogo(id: number, file: File) { const fd = new FormData(); fd.append('logo', file); const res = await fetch(`/api/admin/new-arrivals/${id}/logo`, { method: 'POST', body: fd }); const body = await readJson(res); if (!res.ok) throw new Error(body.message || 'Unable to upload logo'); return body; }
  async function createItem(e: React.FormEvent) {
    e.preventDefault(); if (!newLogo) return setMsg(isArabic ? 'اختر اللوجو أولًا' : 'Choose a logo first');
    const res = await fetch('/api/admin/new-arrivals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: draft.title, targetUrl: draft.targetUrl }) }); const body = await readJson(res);
    if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر إضافة العنصر' : 'Unable to add item'));
    try { await uploadLogo(body.data.id, newLogo); } catch (error) { return setMsg(error instanceof Error ? error.message : 'Unable to upload logo'); }
    setDraft({ title: '', targetUrl: '', isActive: true }); setNewLogo(null); setPanel(null); setMsg(isArabic ? 'تمت إضافة العنصر ورفع اللوجو وحفظه بنجاح' : 'Item added; its logo was uploaded and saved successfully'); await load();
  }
  async function saveItem() { if (!selected) return; const res = await fetch(`/api/admin/new-arrivals/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }); const body = await readJson(res); if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر الحفظ' : 'Unable to save')); setMsg(isArabic ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully'); await load(); }
  async function removeItem(item: BannerItem) { if (!confirm(isArabic ? `حذف ${item.title}؟` : `Delete ${item.title}?`)) return; await fetch(`/api/admin/new-arrivals/${item.id}`, { method: 'DELETE' }); setPanel(null); setSelected(null); await load(); }
  async function replaceLogo(item: BannerItem, file: File) { try { await uploadLogo(item.id, file); setMsg(isArabic ? 'تم رفع اللوجو وحفظه بنجاح' : 'Logo uploaded and saved successfully'); await load(); } catch (error) { setMsg(error instanceof Error ? error.message : 'Unable to upload logo'); } }
  async function move(item: BannerItem, direction: -1 | 1) { const current = items.findIndex((candidate) => candidate.id === item.id); const target = current + direction; if (target < 0 || target >= items.length) return; const next = [...items]; [next[current], next[target]] = [next[target], next[current]]; const res = await fetch('/api/admin/new-arrivals/reorder', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: next.map((candidate) => candidate.id) }) }); if (!res.ok) return setMsg(isArabic ? 'تعذر حفظ الترتيب' : 'Unable to save order'); await load(); }
  async function bulk(action: 'activate' | 'deactivate' | 'delete') {
    const ids = Array.from(selectedIds);
    if (!ids.length || bulkBusy) return;
    if (action === 'delete' && !confirm(isArabic ? `حذف ${ids.length} عنصر؟` : `Delete ${ids.length} items?`)) return;
    setBulkBusy(true);
    const failedIds: number[] = [];
    try {
      for (const id of ids) {
        const response = await fetch(`/api/admin/new-arrivals/${id}`, action === 'delete' ? { method: 'DELETE' } : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: action === 'activate' }) });
        if (!response.ok) failedIds.push(id);
      }
      setSelectedIds(new Set(failedIds));
      setMsg(failedIds.length
        ? (isArabic ? `تعذر تنفيذ العملية على ${failedIds.length} من العناصر المحددة` : `The action failed for ${failedIds.length} selected items`)
        : (isArabic ? 'تم تنفيذ العملية' : 'Action completed'));
      await load();
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم أثناء تنفيذ العملية' : 'Unable to reach the server while processing the action');
    } finally {
      setBulkBusy(false);
    }
  }
  const drawerAnchor = language === 'ar' ? 'left' : 'right';

  return <>
    <Card className="rg-panel-card rg-admin-directory-header"><CardContent sx={{ p: { xs: 2, sm: 2.7 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
        <Box><Stack direction="row" spacing={1} alignItems="center"><AutoAwesomeRoundedIcon color="secondary" /><Typography variant="h5" fontWeight={950}>{t('arrivals')}</Typography></Stack><Typography color="text.secondary" fontSize={13} sx={{ mt: .5 }}>{t('newArrivalInfo')}</Typography></Box>
        <Button className="rg-royal-button" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setDraft({ title: '', targetUrl: '', isActive: true }); setNewLogo(null); setPanel('create'); }}>{t('addArrival')}</Button>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
        <FormControlLabel
          control={<Checkbox disabled={shown.length === 0} checked={shown.length > 0 && shown.every((item) => selectedIds.has(item.id))} indeterminate={shown.some((item) => selectedIds.has(item.id)) && !shown.every((item) => selectedIds.has(item.id))} onChange={(event) => setSelectedIds(event.target.checked ? new Set([...Array.from(selectedIds), ...shown.map((item) => item.id)]) : new Set(Array.from(selectedIds).filter((id) => !shown.some((item) => item.id === id))))} />}
          label={isArabic ? 'اختيار الظاهر' : 'Select visible'}
          disabled={shown.length === 0}
          sx={{ m: 0, minHeight: 44, '& .MuiFormControlLabel-label': { fontWeight: 900, fontSize: 13 } }}
        />
        {selectedIds.size > 0 && <><Button size="small" variant="outlined" color="success" disabled={bulkBusy} onClick={() => bulk('activate')}>{isArabic ? 'تفعيل' : 'Activate'}</Button><Button size="small" variant="outlined" color="warning" disabled={bulkBusy} onClick={() => bulk('deactivate')}>{isArabic ? 'إيقاف' : 'Pause'}</Button><Button size="small" variant="outlined" color="error" disabled={bulkBusy} onClick={() => bulk('delete')}>{t('delete')}</Button></>}
      </Stack>
    </CardContent></Card>
    <Snackbar
      open={!!msg}
      autoHideDuration={5000}
      onClose={(_event, reason) => { if (reason !== 'clickaway') setMsg(''); }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        variant="filled"
        severity={/تعذر|Unable|failed/.test(msg) ? 'error' : 'success'}
        onClose={() => setMsg('')}
        sx={{ width: '100%', fontWeight: 900 }}
      >
        {msg}
      </Alert>
    </Snackbar>
    <Grid container spacing={1.5} className="rg-admin-directory-grid" sx={{ mt: .2 }}>
      {shown.map((item, index) => <Grid item xs={6} sm={4} md={3} lg={2} key={item.id}>
        <Card className="rg-admin-logo-card rg-logo-intro" style={{ '--rg-logo-delay': `${(index % 12) * 45}ms` } as React.CSSProperties}><CardContent sx={{ p: 1.2, position: 'relative' }}>
          <Checkbox size="small" checked={selectedIds.has(item.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} sx={{ position: 'absolute', top: 2, right: 2, zIndex: 2 }} />
          <Tooltip title={item.title}><Box component="button" type="button" className="rg-admin-logo-button" onClick={() => openEdit(item)}>{item.logoUrl ? <Box component="img" src={item.logoUrl} alt={item.title} /> : <Box className="rg-admin-logo-fallback">{initials(item.title)}</Box>}</Box></Tooltip>
          <Button size="small" fullWidth startIcon={<EditRoundedIcon />} onClick={() => openEdit(item)}>{t('details')}</Button>
        </CardContent></Card>
      </Grid>)}
      {!shown.length && <Grid item xs={12}><Card className="rg-panel-card"><CardContent><Typography align="center" color="text.secondary">{isArabic ? 'لا توجد عناصر بعد.' : 'No items yet.'}</Typography></CardContent></Card></Grid>}
    </Grid>
    {totalPages > 1 && <Stack alignItems="center" className="rg-admin-pagination" sx={{ mt: 3 }}><Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" /></Stack>}

    <Drawer anchor={drawerAnchor} open={panel === 'create' || panel === 'edit'} onClose={() => setPanel(null)} PaperProps={{ className: 'rg-admin-edit-drawer', sx: { width: { xs: '100%', sm: 500 }, maxWidth: '100vw' } }}>
      <Stack component="form" onSubmit={panel === 'create' ? createItem : (e) => { e.preventDefault(); saveItem(); }} spacing={1.5} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={950}>{panel === 'create' ? t('addArrival') : t('edit')}</Typography>
        {msg && <Alert severity={/تعذر|Unable|failed/.test(msg) ? 'error' : 'success'} onClose={() => setMsg('')} sx={{ fontWeight: 800 }}>{msg}</Alert>}
        {selected && panel === 'edit' && <Box className="rg-admin-drawer-logo">{selected.logoUrl ? <Box component="img" src={selected.logoUrl} alt={selected.title} /> : initials(selected.title)}</Box>}
        <AdminTextField label={isArabic ? 'اسم داخلي' : 'Internal title'} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
        <AdminTextField label={isArabic ? 'الرابط الخارجي' : 'External link'} value={draft.targetUrl} onChange={(e) => setDraft({ ...draft, targetUrl: e.target.value })} required helperText="https://..." />
        <Button component="label" variant="outlined" startIcon={<UploadRoundedIcon />}>{newLogo?.name || (isArabic ? 'رفع / تغيير اللوجو' : 'Upload / change logo')}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (panel === 'edit' && selected) replaceLogo(selected, file); else setNewLogo(file); event.currentTarget.value = ''; }} /></Button>
        {panel === 'edit' && <><AdminActionToggle checked={draft.isActive} onChange={(checked) => setDraft({ ...draft, isActive: checked })} label={isArabic ? 'ظاهر للمستخدمين' : 'Visible to users'} /><Stack direction="row" spacing={1} className="rg-admin-drawer-actions"><Button variant="outlined" onClick={() => selected && move(selected, -1)} startIcon={<ArrowUpwardRoundedIcon />}>{isArabic ? 'تحريك للأعلى' : 'Move up'}</Button><Button variant="outlined" onClick={() => selected && move(selected, 1)} startIcon={<ArrowDownwardRoundedIcon />}>{isArabic ? 'تحريك للأسفل' : 'Move down'}</Button></Stack><Divider /><Stack direction="row" spacing={1} className="rg-admin-drawer-actions"><Button type="submit" fullWidth variant="contained" startIcon={<SaveRoundedIcon />}>{t('save')}</Button><Button color="error" variant="outlined" onClick={() => selected && removeItem(selected)} startIcon={<DeleteOutlineRoundedIcon />}>{t('delete')}</Button></Stack><Button component="a" href={draft.targetUrl} target="_blank" rel="noopener noreferrer" variant="text" startIcon={<OpenInNewRoundedIcon />}>{isArabic ? 'فتح الرابط' : 'Open link'}</Button></>}
        {panel === 'create' && <Button type="submit" className="rg-royal-button" variant="contained" startIcon={<AddRoundedIcon />}>{t('add')}</Button>}
      </Stack>
    </Drawer>
  </>;
}
