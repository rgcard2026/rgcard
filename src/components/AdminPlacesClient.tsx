'use client';

import * as React from 'react';
import AdminTextField from '@/components/AdminTextField';
import AdminActionToggle from '@/components/AdminActionToggle';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, Divider, Drawer, FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Pagination, Select, Stack, Tooltip, Typography } from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { useUiPreferences } from './UiPreferences';
import ConfirmActionDialog from './ConfirmActionDialog';
import AdminDescriptionFindReplace from './AdminDescriptionFindReplace';

type Category = { id: number; name: string; icon?: string | null };
type Governorate = { id: number; name: string };
type Branch = { id: number; name: string; address?: string | null; phone?: string | null; mapUrl?: string | null; governorate: Governorate };
type PlaceGovernorate = { governorateId: number; governorate: Governorate };
type PlaceOffer = { id: number; title: string; description?: string | null; discountText: string; bannerText?: string | null };
type Place = { id: number; name: string; discount: string; description?: string | null; logoUrl?: string | null; isActive: boolean; exclusiveText?: string | null; categoryId?: number; category: Category; branches: Branch[]; governoratesConfigured: boolean; governorates: PlaceGovernorate[]; offers?: PlaceOffer[] };
type Edit = Partial<Pick<Place, 'name' | 'discount' | 'description' | 'logoUrl' | 'isActive' | 'exclusiveText'>> & { categoryId?: number; governorateIds?: number[] };
type BranchForm = { name: string; governorateId: number | ''; address: string; phone: string; mapUrl: string };
type Panel = 'create' | 'tools' | 'edit' | null;

function emptyBranch(governorates: Governorate[]): BranchForm { return { name: '', governorateId: governorates[0]?.id || '', address: '', phone: '', mapUrl: '' }; }
async function readJson(res: Response) { const text = await res.text(); try { return JSON.parse(text); } catch { return { ok: false, message: text || 'Unable to read server response' }; } }
function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RG'; }
function placeGovernorateIds(place: Place) {
  const ids = place.governoratesConfigured
    ? place.governorates.map((assignment) => assignment.governorateId)
    : place.branches.map((branch) => branch.governorate.id);
  return Array.from(new Set(ids));
}

export default function AdminPlacesClient({ categories: initialCategories, governorates }: { categories: Category[]; governorates: Governorate[] }) {
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [q, setQ] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<number | ''>('');
  const [governorateFilter, setGovernorateFilter] = React.useState<number | ''>('');
  const [page, setPage] = React.useState(1);
  const [msg, setMsg] = React.useState('');
  const [panel, setPanel] = React.useState<Panel>(null);
  const [selected, setSelected] = React.useState<Place | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Place | null>(null);
  const [edit, setEdit] = React.useState<Edit>({});
  const [branchForm, setBranchForm] = React.useState<BranchForm>(emptyBranch(governorates));
  const [createForm, setCreateForm] = React.useState({ name: '', discount: '', description: '', categoryId: initialCategories[0]?.id || 0, governorateIds: [] as number[], branchName: '', governorateId: governorates[0]?.id || 0, address: '', phone: '', mapUrl: '', exclusiveText: '' });
  const [newLogo, setNewLogo] = React.useState<File | null>(null);
  const [categoryName, setCategoryName] = React.useState('');
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [templateBusy, setTemplateBusy] = React.useState(false);
  const [logoBusy, setLogoBusy] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const pageSize = 12;

  const load = React.useCallback(async () => {
    const response = await fetch('/api/admin/places', { cache: 'no-store' });
    const body = await readJson(response);
    if (!response.ok) setMsg(body.message || (isArabic ? 'تعذر تحميل الأماكن' : 'Unable to load places'));
    setPlaces(body.data || []);
  }, [isArabic]);
  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    const value = q.trim().toLowerCase();
    return places.filter((place) => {
      const searchable = [
        place.name,
        place.discount,
        place.description,
        place.exclusiveText,
        place.category?.name,
        ...place.branches.flatMap((branch) => [branch.name, branch.address, branch.phone, branch.governorate.name]),
        ...(place.offers || []).flatMap((offer) => [offer.title, offer.description, offer.discountText, offer.bannerText])
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesText = !value || searchable.includes(value);
      const matchesCategory = !categoryFilter || place.category.id === categoryFilter;
      const matchesGovernorate = !governorateFilter || placeGovernorateIds(place).includes(governorateFilter);
      return matchesText && matchesCategory && matchesGovernorate;
    });
  }, [places, q, categoryFilter, governorateFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  React.useEffect(() => setPage(1), [q, categoryFilter, governorateFilter]);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  function openEdit(place: Place) {
    setSelected(place);
    setEdit({ name: place.name, discount: place.discount, description: place.description || '', exclusiveText: place.exclusiveText || '', isActive: place.isActive, categoryId: place.category.id, logoUrl: place.logoUrl || '', governorateIds: placeGovernorateIds(place) });
    setBranchForm(emptyBranch(governorates));
    setPanel('edit');
  }

  async function saveSelected() {
    if (!selected) return;
    const res = await fetch(`/api/admin/places/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify((({ logoUrl: _logoUrl, ...payload }) => payload)(edit)) });
    const body = await readJson(res);
    if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر الحفظ' : 'Unable to save changes'));
    setMsg(isArabic ? 'تم حفظ المكان' : 'Place saved');
    await load();
    if (body.data) {
      setSelected(body.data);
      setEdit({ name: body.data.name, discount: body.data.discount, description: body.data.description || '', exclusiveText: body.data.exclusiveText || '', isActive: body.data.isActive, categoryId: body.data.category.id, logoUrl: body.data.logoUrl || '', governorateIds: placeGovernorateIds(body.data) });
    }
  }

  function removeSelected() { if (selected) setPendingDelete(selected); }

  async function confirmDeletePlace() {
    if (!pendingDelete) return;
    const res = await fetch(`/api/admin/places/${pendingDelete.id}`, { method: 'DELETE' });
    if (!res.ok) { setMsg(isArabic ? 'تعذر حذف المكان' : 'Unable to delete place'); return; }
    setPanel(null); setSelected(null); setPendingDelete(null); setMsg(isArabic ? 'تم حذف المكان' : 'Place deleted'); await load();
  }

  async function uploadLogo(place: Place, file: File) {
    if (logoBusy) return;
    setLogoBusy(true);
    setMsg(isArabic ? 'جاري رفع اللوجو...' : 'Uploading logo...');
    try {
      const fd = new FormData(); fd.append('logo', file);
      const res = await fetch(`/api/admin/places/${place.id}/logo`, { method: 'POST', body: fd });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر رفع اللوجو' : 'Unable to upload logo'));
      const logoUrl = body.data?.logoUrl || body.logoUrl;
      setSelected((current) => current ? { ...current, logoUrl: logoUrl || current.logoUrl } : current);
      setEdit((current) => ({ ...current, logoUrl: logoUrl || current.logoUrl }));
      setPlaces((current) => current.map((item) => item.id === place.id ? { ...item, logoUrl: logoUrl || item.logoUrl } : item));
      setMsg(isArabic ? 'تم رفع اللوجو وتطبيقه بنجاح' : 'Logo uploaded and applied successfully');
      await load();
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم أثناء رفع اللوجو' : 'Unable to reach the server while uploading the logo');
    } finally {
      setLogoBusy(false);
    }
  }

  async function createPlace(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.discount.trim()) return setMsg(isArabic ? 'اسم المكان والخصم مطلوبان' : 'Place name and discount are required');
    try {
      const res = await fetch('/api/admin/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createForm) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر إضافة المكان' : 'Unable to add place'));
      if (newLogo && body.data?.id) await uploadLogo(body.data, newLogo);
      setCreateForm({ ...createForm, name: '', discount: '', description: '', governorateIds: [], branchName: '', address: '', phone: '', mapUrl: '', exclusiveText: '' });
      setNewLogo(null); setPanel(null); setMsg(isArabic ? 'تمت إضافة المكان' : 'Place added'); await load();
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم أثناء إضافة المكان' : 'Unable to reach the server while adding the place');
    }
  }

  async function addCategory() {
    if (!categoryName.trim()) return setMsg(isArabic ? 'اكتب اسم الفئة أولًا' : 'Enter a category name first');
    try {
      const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: categoryName.trim(), icon: 'local_offer' }) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر إضافة الفئة' : 'Unable to add category'));
      setCategories((current) => [...current, body.data]); setCategoryName(''); setMsg(isArabic ? 'تمت إضافة الفئة' : 'Category added');
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم أثناء إضافة الفئة' : 'Unable to reach the server while adding the category');
    }
  }

  async function importCsv() {
    if (!csvFile) return setMsg(isArabic ? 'اختر ملف CSV أولًا' : 'Choose a CSV file first');
    const fd = new FormData(); fd.append('file', csvFile);
    const res = await fetch('/api/admin/places/import', { method: 'POST', body: fd });
    const body = await readJson(res);
    if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر الاستيراد' : 'Import failed'));
    const validationErrors = Array.isArray(body.data?.validationErrors) ? body.data.validationErrors.slice(0, 3) : [];
    const errorDetails = validationErrors.map((item: { row: number; message: string }) => `${isArabic ? 'صف' : 'Row'} ${item.row}: ${item.message}`).join(' | ');
    setCsvFile(null);
    setMsg(`${body.message || (isArabic ? 'تم الاستيراد' : 'Import completed')}${errorDetails ? ` — ${errorDetails}` : ''}`);
    await load();
  }

  async function replaceTemplate() {
    if (templateBusy) return;
    if (!confirm(isArabic ? 'سيتم حذف بيانات الأماكن والعروض الحالية ثم رفع ملف العميل المعتمد كاملًا باللوجوهات والمحافظات. هل تريد المتابعة؟' : 'This deletes current places and offers, then imports the full approved client data with logos and governorates. Continue?')) return;
    const confirmation = prompt(isArabic ? 'اكتب استبدال للتأكيد:' : 'Type REPLACE to confirm:');
    if (!(confirmation === 'استبدال' || confirmation === 'REPLACE')) return;
    setTemplateBusy(true);
    setMsg(isArabic ? 'جاري رفع 164 مكانًا و166 عرضًا مع اللوجوهات وتقسيم الفروع حسب المحافظات...' : 'Importing 164 places and 166 offers with logos and governorate-based branches...');
    try {
      const res = await fetch('/api/admin/places/replace-template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'REPLACE_DEMO_DATA' }) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر رفع بيانات العميل' : 'Unable to import client data'));
      setPanel(null);
      setMsg(body.message || (isArabic ? 'تم رفع بيانات العميل كاملة' : 'Client data imported'));
      await load();
    } finally {
      setTemplateBusy(false);
    }
  }

  async function addBranch() {
    if (!selected || !branchForm.name || !branchForm.governorateId) return setMsg(isArabic ? 'اسم الفرع والمحافظة مطلوبان' : 'Branch name and governorate are required');
    try {
      const res = await fetch('/api/admin/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...branchForm, placeId: selected.id }) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر إضافة الفرع' : 'Unable to add branch'));
      setBranchForm(emptyBranch(governorates)); await load();
      const next = await fetch('/api/admin/places').then(readJson); setSelected((next.data || []).find((place: Place) => place.id === selected.id) || selected);
      setMsg(isArabic ? 'تمت إضافة الفرع بنجاح' : 'Branch added successfully');
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم أثناء إضافة الفرع' : 'Unable to reach the server while adding the branch');
    }
  }

  async function removeBranch(id: number) {
    if (!confirm(isArabic ? 'حذف الفرع؟' : 'Delete this branch?')) return;
    await fetch(`/api/admin/branches/${id}`, { method: 'DELETE' }); await load();
    if (selected) { const next = await fetch('/api/admin/places').then(readJson); setSelected((next.data || []).find((place: Place) => place.id === selected.id) || selected); }
  }

  async function bulk(action: 'activate' | 'deactivate' | 'delete') {
    const ids = Array.from(selectedIds);
    if (!ids.length || bulkBusy) return;
    if (action === 'delete' && !confirm(isArabic ? `حذف ${ids.length} مكان؟` : `Delete ${ids.length} places?`)) return;
    setBulkBusy(true);
    const failedIds: number[] = [];
    try {
      for (const id of ids) {
        const response = await fetch(`/api/admin/places/${id}`, action === 'delete' ? { method: 'DELETE' } : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: action === 'activate' }) });
        if (!response.ok) failedIds.push(id);
      }
      setSelectedIds(new Set(failedIds));
      setMsg(failedIds.length
        ? (isArabic ? `تعذر تنفيذ العملية على ${failedIds.length} من الأماكن المحددة` : `The action failed for ${failedIds.length} selected places`)
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
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
        <Box><Typography variant="h5" fontWeight={950}>{t('places')}</Typography><Typography color="text.secondary" fontSize={13}>{isArabic ? 'اللوجوهات فقط في القائمة. افتح أي لوجو لمشاهدة البيانات والتعديل داخل لوحة جانبية.' : 'The directory shows logos only. Open any logo to view details and edit it in a side panel.'}</Typography></Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="rg-admin-header-actions">
          <AdminDescriptionFindReplace onCompleted={load} />
          <Button variant="outlined" startIcon={<TuneRoundedIcon />} onClick={() => setPanel('tools')}>{isArabic ? 'أدوات الإدارة' : 'Management tools'}</Button>
          <Button variant="contained" className="rg-royal-button" startIcon={<AddBusinessRoundedIcon />} onClick={() => setPanel('create')}>{t('createPlace')}</Button>
        </Stack>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }} alignItems={{ xs: 'stretch', md: 'center' }}>
        <AdminTextField size="small" placeholder={isArabic ? 'ابحث باسم البراند أو كلمة من الوصف...' : 'Search brand name or description keyword...'} value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1, minWidth: { md: 260 } }} />
        <FormControl size="small" sx={{ minWidth: { md: 180 } }}>
          <InputLabel>{isArabic ? 'الفئة' : 'Category'}</InputLabel>
          <Select label={isArabic ? 'الفئة' : 'Category'} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value === '' ? '' : Number(event.target.value))}>
            <MenuItem value="">{isArabic ? 'كل الفئات' : 'All categories'}</MenuItem>
            {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { md: 180 } }}>
          <InputLabel>{isArabic ? 'المحافظة' : 'Governorate'}</InputLabel>
          <Select label={isArabic ? 'المحافظة' : 'Governorate'} value={governorateFilter} onChange={(event) => setGovernorateFilter(event.target.value === '' ? '' : Number(event.target.value))}>
            <MenuItem value="">{isArabic ? 'كل المحافظات' : 'All governorates'}</MenuItem>
            {governorates.map((governorate) => <MenuItem key={governorate.id} value={governorate.id}>{governorate.name}</MenuItem>)}
          </Select>
        </FormControl>
        {(q || categoryFilter || governorateFilter) && <Button variant="text" onClick={() => { setQ(''); setCategoryFilter(''); setGovernorateFilter(''); }}>{isArabic ? 'مسح الفلاتر' : 'Clear filters'}</Button>}
        <Chip label={`${filtered.length} ${isArabic ? 'مكان' : 'places'}`} />
      </Stack>
      <Stack direction="row" spacing={.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.4 }} className="rg-admin-bulk-actions">
        <FormControlLabel
          control={<Checkbox disabled={shown.length === 0} checked={shown.length > 0 && shown.every((place) => selectedIds.has(place.id))} indeterminate={shown.some((place) => selectedIds.has(place.id)) && !shown.every((place) => selectedIds.has(place.id))} onChange={(event) => setSelectedIds(event.target.checked ? new Set([...Array.from(selectedIds), ...shown.map((place) => place.id)]) : new Set(Array.from(selectedIds).filter((id) => !shown.some((place) => place.id === id))))} />}
          label={isArabic ? 'اختيار الظاهر' : 'Select visible'}
          disabled={shown.length === 0}
          sx={{ m: 0, minHeight: 44, '& .MuiFormControlLabel-label': { fontWeight: 900, fontSize: 13 } }}
        />
        {selectedIds.size > 0 && <><Button size="small" color="success" variant="outlined" disabled={bulkBusy} onClick={() => bulk('activate')}>{isArabic ? 'تفعيل' : 'Activate'}</Button><Button size="small" color="warning" variant="outlined" disabled={bulkBusy} onClick={() => bulk('deactivate')}>{isArabic ? 'إيقاف' : 'Pause'}</Button><Button size="small" color="error" variant="outlined" disabled={bulkBusy} onClick={() => bulk('delete')}>{t('delete')}</Button></>}
      </Stack>
    </CardContent></Card>

    {msg && <Alert severity={/تعذر|Unable|failed|رفض|Delete/.test(msg) ? 'error' : 'success'} sx={{ mt: 1.5 }}>{msg}</Alert>}
    <Grid container spacing={1.5} className="rg-admin-directory-grid" sx={{ mt: .2 }}>
      {shown.map((place, index) => <Grid item xs={6} sm={4} md={3} lg={2} key={place.id}>
        <Card className="rg-admin-logo-card rg-logo-intro" style={{ '--rg-logo-delay': `${(index % 12) * 45}ms` } as React.CSSProperties}>
          <CardContent sx={{ p: 1.2, height: '100%', position: 'relative' }}>
            <Checkbox size="small" checked={selectedIds.has(place.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); next.has(place.id) ? next.delete(place.id) : next.add(place.id); return next; })} sx={{ position: 'absolute', top: 2, right: 2, zIndex: 2 }} inputProps={{ 'aria-label': `${isArabic ? 'اختيار' : 'Select'} ${place.name}` }} />
            <Tooltip title={place.name}><Box component="button" type="button" onClick={() => openEdit(place)} className="rg-admin-logo-button" aria-label={`${t('openDetails')}: ${place.name}`}>
              {place.logoUrl ? <Box component="img" src={place.logoUrl} alt={place.name} /> : <Box className="rg-admin-logo-fallback">{initials(place.name)}</Box>}
            </Box></Tooltip>
            <Button size="small" fullWidth startIcon={<EditRoundedIcon />} onClick={() => openEdit(place)}>{t('details')}</Button>
          </CardContent>
        </Card>
      </Grid>)}
      {!shown.length && <Grid item xs={12}><Card className="rg-panel-card"><CardContent><Typography align="center" color="text.secondary">{isArabic ? 'لا توجد نتائج.' : 'No results found.'}</Typography></CardContent></Card></Grid>}
    </Grid>
    {totalPages > 1 && <Stack alignItems="center" className="rg-admin-pagination" sx={{ mt: 3 }}><Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" /></Stack>}

    <Drawer anchor={drawerAnchor} open={panel === 'edit'} onClose={() => setPanel(null)} PaperProps={{ className: 'rg-admin-edit-drawer', sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100vw' } }}>
      {selected && <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h5" fontWeight={950}>{t('edit')}</Typography><Typography color="text.secondary">{selected.name}</Typography></Box><IconButton onClick={() => setPanel(null)}><MoreHorizRoundedIcon /></IconButton></Stack>
        <Box className="rg-admin-drawer-logo">{edit.logoUrl || selected.logoUrl ? <Box component="img" src={String(edit.logoUrl || selected.logoUrl)} alt={selected.name} /> : initials(selected.name)}</Box>
        <Button disabled={logoBusy} component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>{logoBusy ? (isArabic ? 'جاري رفع اللوجو...' : 'Uploading logo...') : (isArabic ? 'تغيير اللوجو' : 'Change logo')}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(selected, file); event.currentTarget.value = ''; }} /></Button>
        <AdminTextField label={isArabic ? 'اسم المكان' : 'Place name'} value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <AdminTextField label={isArabic ? 'نص الخصم' : 'Discount text'} value={edit.discount || ''} onChange={(e) => setEdit({ ...edit, discount: e.target.value })} />
        <AdminTextField label={isArabic ? 'الوصف' : 'Description'} multiline minRows={3} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        <AdminTextField label={isArabic ? 'ملاحظة خاصة' : 'Exclusive note'} multiline minRows={2} value={edit.exclusiveText || ''} onChange={(e) => setEdit({ ...edit, exclusiveText: e.target.value })} />
        <FormControl fullWidth><InputLabel>{isArabic ? 'الفئة' : 'Category'}</InputLabel><Select label={isArabic ? 'الفئة' : 'Category'} value={edit.categoryId || ''} onChange={(e) => setEdit({ ...edit, categoryId: Number(e.target.value) })}>{categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth>
          <InputLabel>{isArabic ? 'المحافظات المتاحة' : 'Available governorates'}</InputLabel>
          <Select
            multiple
            label={isArabic ? 'المحافظات المتاحة' : 'Available governorates'}
            value={edit.governorateIds || []}
            onChange={(event) => setEdit({ ...edit, governorateIds: (typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value).map(Number) })}
            renderValue={(selectedValues) => (selectedValues as number[]).map((id) => governorates.find((governorate) => governorate.id === id)?.name).filter(Boolean).join('، ')}
          >
            {governorates.map((governorate) => <MenuItem key={governorate.id} value={governorate.id}><Checkbox checked={(edit.governorateIds || []).includes(governorate.id)} />{governorate.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography color="text.secondary" fontSize={12}>{isArabic ? 'حدد كل المحافظات التي يتوفر فيها البراند دفعة واحدة. لا يتم حذف بيانات الفروع عند إزالة محافظة.' : 'Assign all governorates for this brand in one save. Branch records are never deleted when a governorate is unchecked.'}</Typography>
        <AdminActionToggle checked={Boolean(edit.isActive)} onChange={(checked) => setEdit({ ...edit, isActive: checked })} label={isArabic ? 'مفعل للمستخدمين' : 'Visible to users'} />
        <Stack direction="row" spacing={1} className="rg-admin-drawer-actions"><Button fullWidth variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveSelected}>{t('save')}</Button><Button color="error" variant="outlined" onClick={removeSelected}>{t('delete')}</Button></Stack>
        <Divider />
        <Stack direction="row" spacing={1} alignItems="center"><LocationOnRoundedIcon color="secondary" /><Typography fontWeight={950}>{isArabic ? 'الفروع والتواصل' : 'Branches & contact'}</Typography></Stack>
        <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>{selected.branches.map((branch) => <Chip key={branch.id} label={`${branch.name} • ${branch.governorate.name}`} onDelete={() => removeBranch(branch.id)} />)}{!selected.branches.length && <Typography color="text.secondary" fontSize={13}>{isArabic ? 'لا توجد فروع بعد.' : 'No branches yet.'}</Typography>}</Stack>
        <AdminTextField size="small" label={isArabic ? 'اسم الفرع' : 'Branch name'} value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
        <FormControl size="small" fullWidth><InputLabel>{isArabic ? 'المحافظة' : 'Governorate'}</InputLabel><Select label={isArabic ? 'المحافظة' : 'Governorate'} value={branchForm.governorateId} onChange={(e) => setBranchForm({ ...branchForm, governorateId: Number(e.target.value) })}>{governorates.map((gov) => <MenuItem key={gov.id} value={gov.id}>{gov.name}</MenuItem>)}</Select></FormControl>
        <AdminTextField size="small" label={isArabic ? 'العنوان' : 'Address'} value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
        <AdminTextField size="small" label={isArabic ? 'الهاتف' : 'Phone'} value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
        <AdminTextField size="small" label={isArabic ? 'رابط الخريطة' : 'Map URL'} value={branchForm.mapUrl} onChange={(e) => setBranchForm({ ...branchForm, mapUrl: e.target.value })} />
        <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={addBranch}>{isArabic ? 'إضافة فرع' : 'Add branch'}</Button>
      </Stack>}
    </Drawer>

    <Drawer anchor={drawerAnchor} open={panel === 'create'} onClose={() => setPanel(null)} PaperProps={{ className: 'rg-admin-edit-drawer', sx: { width: { xs: '100%', sm: 500 }, maxWidth: '100vw' } }}>
      <Stack component="form" onSubmit={createPlace} spacing={1.5} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={950}>{t('createPlace')}</Typography>
        <AdminTextField label={isArabic ? 'اسم المكان' : 'Place name'} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
        <AdminTextField label={isArabic ? 'نص الخصم' : 'Discount text'} value={createForm.discount} onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })} required />
        <AdminTextField label={isArabic ? 'الوصف' : 'Description'} multiline minRows={3} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
        <FormControl fullWidth><InputLabel>{isArabic ? 'الفئة' : 'Category'}</InputLabel><Select label={isArabic ? 'الفئة' : 'Category'} value={createForm.categoryId} onChange={(e) => setCreateForm({ ...createForm, categoryId: Number(e.target.value) })}>{categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth>
          <InputLabel>{isArabic ? 'المحافظات المتاحة' : 'Available governorates'}</InputLabel>
          <Select
            multiple
            label={isArabic ? 'المحافظات المتاحة' : 'Available governorates'}
            value={createForm.governorateIds}
            onChange={(event) => setCreateForm({ ...createForm, governorateIds: (typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value).map(Number) })}
            renderValue={(selectedValues) => (selectedValues as number[]).map((id) => governorates.find((governorate) => governorate.id === id)?.name).filter(Boolean).join('، ')}
          >
            {governorates.map((governorate) => <MenuItem key={governorate.id} value={governorate.id}><Checkbox checked={createForm.governorateIds.includes(governorate.id)} />{governorate.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>{newLogo?.name || (isArabic ? 'رفع لوجو' : 'Upload logo')}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setNewLogo(event.target.files?.[0] || null)} /></Button>
        <Divider /><Typography fontWeight={950}>{isArabic ? 'أول فرع (اختياري)' : 'First branch (optional)'}</Typography>
        <AdminTextField size="small" label={isArabic ? 'اسم الفرع' : 'Branch name'} value={createForm.branchName} onChange={(e) => setCreateForm({ ...createForm, branchName: e.target.value })} />
        <FormControl size="small" fullWidth><InputLabel>{isArabic ? 'المحافظة' : 'Governorate'}</InputLabel><Select label={isArabic ? 'المحافظة' : 'Governorate'} value={createForm.governorateId} onChange={(e) => setCreateForm({ ...createForm, governorateId: Number(e.target.value) })}>{governorates.map((gov) => <MenuItem key={gov.id} value={gov.id}>{gov.name}</MenuItem>)}</Select></FormControl>
        <AdminTextField size="small" label={isArabic ? 'العنوان' : 'Address'} value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} />
        <Button type="submit" className="rg-royal-button" variant="contained" startIcon={<AddBusinessRoundedIcon />}>{t('add')}</Button>
      </Stack>
    </Drawer>

    <Drawer anchor={drawerAnchor} open={panel === 'tools'} onClose={() => setPanel(null)} PaperProps={{ className: 'rg-admin-edit-drawer', sx: { width: { xs: '100%', sm: 500 }, maxWidth: '100vw' } }}>
      <Stack spacing={2.2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={950}>{isArabic ? 'أدوات الأماكن والعروض' : 'Places & offers tools'}</Typography>
        <Card variant="outlined"><CardContent><Stack spacing={1}><Stack direction="row" spacing={1} alignItems="center"><CategoryRoundedIcon color="secondary" /><Typography fontWeight={950}>{t('createCategory')}</Typography></Stack><AdminTextField size="small" label={isArabic ? 'اسم الفئة' : 'Category name'} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /><Button variant="outlined" onClick={addCategory}>{t('add')}</Button></Stack></CardContent></Card>
        <Card variant="outlined"><CardContent><Stack spacing={1}><Typography fontWeight={950}>{t('importCsv')}</Typography><Typography color="text.secondary" fontSize={12}>name, discount, category, description, branchName, governorate, address, phone, mapUrl, exclusiveText</Typography><Button component="a" href="/api/admin/places/import" download variant="outlined" color="secondary" startIcon={<FileUploadRoundedIcon />}>{isArabic ? 'تنزيل قالب CSV جاهز' : 'Download ready CSV template'}</Button><Button component="label" variant="outlined" startIcon={<FileUploadRoundedIcon />}>{csvFile?.name || 'CSV'}<input hidden type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] || null)} /></Button><Button disabled={!csvFile} variant="contained" onClick={importCsv}>{isArabic ? 'استيراد' : 'Import'}</Button></Stack></CardContent></Card>
        <Card variant="outlined"><CardContent><Stack spacing={1}><Typography fontWeight={950}>{isArabic ? 'بحث واستبدال داخل الوصف والملاحظات' : 'Find & replace in descriptions and notes'}</Typography><Typography color="text.secondary" fontSize={13}>{isArabic ? 'تحديث جماعي آمن لوصف وملاحظات الأماكن والعروض مع معاينة وتأكيد قبل الحفظ.' : 'Safely update place and offer descriptions or notes in bulk with a preview and confirmation before saving.'}</Typography><AdminDescriptionFindReplace onCompleted={async () => { setPanel(null); await load(); }} /></Stack></CardContent></Card>
        <Card variant="outlined" sx={{ borderColor: 'rgba(20,184,166,.45)' }}><CardContent><Stack spacing={1}><Typography fontWeight={950}>{isArabic ? 'رفع بيانات العميل الجاهزة بالصور' : 'Import approved client data with images'}</Typography><Typography color="text.secondary" fontSize={13}>{isArabic ? 'يرفع 164 مكانًا فعليًا و166 عرضًا، يدمج السجلات المكررة، ويقسم الفروع حسب كل محافظة مع اللوجوهات. متاح لحساب Owner فقط ويستبدل البيانات الحالية.' : 'Imports 164 actual places and 166 offers, merges duplicate rows, groups branches by governorate, and includes all logos. Owner only; current data will be replaced.'}</Typography><Button disabled={templateBusy} color="success" variant="contained" onClick={replaceTemplate}>{templateBusy ? (isArabic ? 'جاري الرفع...' : 'Importing...') : (isArabic ? 'رفع الأماكن والعروض واللوجوهات' : 'Import places, offers, and logos')}</Button></Stack></CardContent></Card>
      </Stack>
    </Drawer>
    <ConfirmActionDialog
      open={Boolean(pendingDelete)}
      title={isArabic ? 'تأكيد حذف المكان' : 'Confirm place deletion'}
      description={pendingDelete ? (isArabic ? `سيتم حذف ${pendingDelete.name} نهائيًا.` : `This permanently deletes ${pendingDelete.name}.`) : ''}
      confirmLabel={isArabic ? 'حذف المكان' : 'Delete place'}
      cancelLabel={isArabic ? 'إلغاء' : 'Cancel'}
      onClose={() => setPendingDelete(null)}
      onConfirm={confirmDeletePlace}
    />
  </>;
}