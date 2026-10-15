'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import AdminTextField, { type AdminTextFieldProps } from '@/components/AdminTextField';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputAdornment, Menu, MenuItem, Pagination, Select, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { MEMBERSHIP_CLASSES } from '@/lib/card-layout';
import { useUiPreferences } from './UiPreferences';
import PasswordStrength, { isStrongEnough } from './PasswordStrength';
import ConfirmActionDialog from './ConfirmActionDialog';
import AdminActionToggle from './AdminActionToggle';

type PlaceOption = { id: number; name: string; discount: string };
type CustomDiscount = { id: number; discountText: string; place: PlaceOption };
type User = { id: string; fullName: string; idNumber: string; cardNumber: string; isActive: boolean; isVip: boolean; membershipClass: string; mustChangePassword: boolean; failedLoginAttempts?: number; lockCount?: number; blockedUntil?: string | null; lockedAt?: string | null; expiredAt?: string | null; validUntil?: string | null; currentSessionId?: string | null; sessionExpiresAt?: string | null; createdAt: string; customDiscounts?: CustomDiscount[]; _count?: { auditLogs: number } };
type EditState = Partial<Pick<User, 'fullName' | 'idNumber' | 'cardNumber' | 'isActive' | 'isVip' | 'membershipClass' | 'mustChangePassword'>> & { validUntil?: string | null; password?: string };
type LogEntry = { id: number; action: string; path?: string | null; ip?: string | null; createdAt: string };

async function readJson(res: Response) { const text = await res.text(); try { return JSON.parse(text); } catch { return { ok: false, message: text || 'Unable to read server response' }; } }
function toDateInput(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RG'; }


type AdminSidePanelProps = {
  open: boolean;
  anchor: 'left' | 'right';
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

type UserEditorFieldProps = Omit<AdminTextFieldProps, 'label'> & { label: string };

function UserEditorField({ label, className, id, required, ...props }: UserEditorFieldProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className={`rg-user-input-field${className ? ` ${className}` : ''}`}>
      <label className="rg-user-input-label" htmlFor={inputId}>
        {label}{required && <span className="rg-user-input-required"> *</span>}
      </label>
      <AdminTextField {...props} id={inputId} label={undefined} required={required} noExpand />
    </div>
  );
}

type UserPasswordFieldProps = Omit<UserEditorFieldProps, 'type' | 'InputProps'> & { isArabic: boolean };

function UserPasswordField({ label, isArabic, ...props }: UserPasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <UserEditorField
      {...props}
      label={label}
      type={visible ? 'text' : 'password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end" sx={{ pointerEvents: 'auto' }}>
            <IconButton
              type="button"
              size="small"
              edge="end"
              aria-label={visible ? (isArabic ? 'إخفاء كلمة المرور' : 'Hide password') : (isArabic ? 'إظهار كلمة المرور' : 'Show password')}
              aria-pressed={visible}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setVisible((current) => !current)}
              sx={{ pointerEvents: 'auto', position: 'relative', zIndex: 3 }}
            >
              {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

type UserEditorSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};

function UserEditorSelect({ label, value, onChange, children }: UserEditorSelectProps) {
  const id = React.useId();
  const labelId = `${id}-label`;

  return (
    <div className="rg-user-input-field">
      <label id={labelId} className="rg-user-input-label" htmlFor={id}>{label}</label>
      <FormControl fullWidth>
        <Select
          id={id}
          labelId={labelId}
          value={value}
          onChange={(event) => onChange(String(event.target.value))}
        >
          {children}
        </Select>
      </FormControl>
    </div>
  );
}

function AdminSidePanel({ open, anchor, title, onClose, children }: AdminSidePanelProps) {
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflowY = document.documentElement.style.overflowY;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflowY = previousRootOverflowY;
      window.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="rg-admin-side-panel-root" data-open="true" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="rg-admin-side-panel-backdrop" aria-hidden="true" />
      <section
        className={`rg-admin-side-panel rg-admin-side-panel-${anchor}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="rg-admin-side-panel-toolbar">
          <IconButton ref={closeButtonRef} type="button" onClick={onClose} aria-label={title} className="rg-admin-side-panel-close">
            <CloseRoundedIcon />
          </IconButton>
        </div>
        <div className="rg-admin-side-panel-scroll">{children}</div>
      </section>
    </div>,
    document.body
  );
}

function userSecurityState(user: User, isArabic: boolean) {
  if (user.expiredAt || (user.validUntil && new Date(user.validUntil) < new Date())) return { label: (isArabic ? 'منتهي' : 'Expired'), color: 'error' as const };
  if (user.lockedAt || !user.isActive) return { label: (isArabic ? 'موقوف' : 'Inactive'), color: 'error' as const };
  if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) return { label: (isArabic ? 'محظور مؤقتًا' : 'Temporarily blocked'), color: 'warning' as const };
  return { label: (isArabic ? 'نشط' : 'Active'), color: 'success' as const };
}

export default function AdminUsersClient() {
  const { language, t } = useUiPreferences(); const isArabic = language === 'ar';
  const [users, setUsers] = React.useState<User[]>([]); const [places, setPlaces] = React.useState<PlaceOption[]>([]);
  const [total, setTotal] = React.useState(0); const [q, setQ] = React.useState(''); const [page, setPage] = React.useState(1); const pageSize = 12;
  const CARDS_BATCH = 500;
  const [cardsMenu, setCardsMenu] = React.useState<{ anchor: HTMLElement; endpoint: string } | null>(null);
  function openCards(event: React.MouseEvent<HTMLElement>, endpoint: string) {
    if (total <= CARDS_BATCH) {
      window.open(`${endpoint}?includeInactive=1&download=1`, '_blank', 'noopener,noreferrer');
    } else {
      setCardsMenu({ anchor: event.currentTarget, endpoint });
    }
  }
  const cardBatches = Math.max(1, Math.ceil(total / CARDS_BATCH));
  const [cardsByNumberOpen, setCardsByNumberOpen] = React.useState(false);
  const [cardNumbersInput, setCardNumbersInput] = React.useState('');
  const parsedCardNumbers = cardNumbersInput.split(/[\s,;\n]+/).map((v) => v.trim()).filter(Boolean);
  function downloadByNumbers(endpoint: string) {
    if (!parsedCardNumbers.length) return;
    window.open(`${endpoint}?cards=${encodeURIComponent(parsedCardNumbers.slice(0, 500).join(','))}&download=1`, '_blank', 'noopener,noreferrer');
  }
  const [panel, setPanel] = React.useState<'create' | 'edit' | 'tools' | null>(null); const [selected, setSelected] = React.useState<User | null>(null);
  const [editTab, setEditTab] = React.useState<'profile' | 'benefits'>('profile');
  const [edit, setEdit] = React.useState<EditState>({}); const [msg, setMsg] = React.useState('');
  const [busyAction, setBusyAction] = React.useState<'create' | 'save' | 'status' | 'delete' | 'details' | 'discount' | 'import' | 'bulk' | null>(null);
  const [createForm, setCreateForm] = React.useState({ fullName: '', idNumber: '', cardNumber: '', password: '', membershipClass: 'Regular', validUntil: '2027-12-31', mustChangePassword: true });
  const [createPasswordConfirm, setCreatePasswordConfirm] = React.useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = React.useState('');
  const [resetPasswordMode, setResetPasswordMode] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<User | null>(null);
  const [csvFile, setCsvFile] = React.useState<File | null>(null); const [csvValidUntil, setCsvValidUntil] = React.useState('2027-12-31');
  const [discount, setDiscount] = React.useState({ placeId: '', discountText: '' }); const [discounts, setDiscounts] = React.useState<CustomDiscount[]>([]); const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    const params = new URLSearchParams({ take: String(pageSize), skip: String((page - 1) * pageSize) }); if (q.trim()) params.set('q', q.trim());
    const [usersResponse, placesResponse] = await Promise.all([fetch(`/api/admin/users?${params}`, { cache: 'no-store' }), fetch('/api/admin/places', { cache: 'no-store' })]);
    const usersBody = await readJson(usersResponse); const placesBody = await readJson(placesResponse);
    if (!usersResponse.ok) setMsg(usersBody.message || (t('adm_181')));
    setUsers(usersBody.data || []); setTotal(usersBody.total || 0); setPlaces(placesBody.data || []);
  }, [isArabic, page, q]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => setPage(1), [q]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const messageIsError = /تعذر|خطأ|مستخدم بالفعل|Unable|failed|error|already used/i.test(msg);

  const blurFocusedElement = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, []);

  const closePanel = React.useCallback(() => {
    blurFocusedElement();
    setPanel(null);
    setEditPasswordConfirm('');
    setResetPasswordMode(false);
  }, [blurFocusedElement]);

  function openEdit(user: User) {
    setMsg('');
    setSelected(user);
    setEditTab('profile');
    setEdit({ fullName: user.fullName, idNumber: user.idNumber, cardNumber: user.cardNumber, isActive: user.isActive, membershipClass: user.membershipClass || 'Regular', isVip: user.isVip, mustChangePassword: user.mustChangePassword, validUntil: toDateInput(user.validUntil), password: '' });
    setDiscounts(user.customDiscounts || []);
    setDiscount({ placeId: '', discountText: '' });
    setLogs([]);
    setEditPasswordConfirm('');
    setResetPasswordMode(false);
    setPanel('edit');
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (busyAction) return;
    if (!isStrongEnough(createForm.password) || createForm.password !== createPasswordConfirm) return setMsg(t('adm_174'));
    setBusyAction('create');
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...createForm, isVip: createForm.membershipClass === 'VIP' }) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (t('adm_182')));
      setCreateForm({ ...createForm, fullName: '', idNumber: '', cardNumber: '', password: '' });
      setCreatePasswordConfirm('');
      closePanel();
      setMsg(t('adm_183'));
      await load();
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveUser() {
    if (!selected || busyAction) return;
    if (resetPasswordMode && (!edit.password || !isStrongEnough(edit.password) || edit.password !== editPasswordConfirm)) return setMsg(t('adm_174'));
    setBusyAction('save');
    try {
      const payload = { ...edit, isVip: edit.membershipClass === 'VIP' } as EditState & { isVip?: boolean };
      if (!resetPasswordMode) delete payload.password;
      const res = await fetch(`/api/admin/users/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (t('adm_61')));
      setEditPasswordConfirm('');
      setResetPasswordMode(false);
      setEdit((current) => ({ ...current, password: '' }));
      await load();
      closePanel();
      setMsg(resetPasswordMode ? (t('adm_185')) : (t('adm_85')));
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  function removeUser(user: User) {
    blurFocusedElement();
    window.requestAnimationFrame(() => setPendingDelete(user));
  }

  async function confirmDeleteUser() {
    if (!pendingDelete || busyAction) return;
    setBusyAction('delete');
    try {
      const res = await fetch(`/api/admin/users/${pendingDelete.id}`, { method: 'DELETE' });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (t('adm_63')));
      closePanel();
      setSelected(null);
      setPendingDelete(null);
      setMsg(t('adm_186'));
      await load();
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleUserStatus() {
    if (!selected || busyAction) return;
    const nextActive = !Boolean(selected.isActive);
    setBusyAction('status');
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: nextActive }) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (t('adm_187')));
      setEdit((current) => ({ ...current, isActive: nextActive }));
      setSelected((current) => current ? { ...current, isActive: nextActive, ...(nextActive ? { lockedAt: null, blockedUntil: null } : {}) } : current);
      await load();
      closePanel();
      setMsg(nextActive ? (t('adm_188')) : (t('adm_189')));
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  async function loadDetails() {
    if (!selected || busyAction) return;
    setBusyAction('details');
    try {
      const [discountResponse, logResponse] = await Promise.all([fetch(`/api/admin/users/${selected.id}/discounts`), fetch(`/api/admin/users/${selected.id}/logs?take=12`)]);
      const discountBody = await readJson(discountResponse);
      const logBody = await readJson(logResponse);
      if (!discountResponse.ok || !logResponse.ok) return setMsg(t('adm_190'));
      setDiscounts(discountBody.data || []);
      setLogs(logBody.data || []);
      setMsg(t('adm_191'));
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveDiscount() {
    if (!selected || !discount.placeId || !discount.discountText || busyAction) return;
    setBusyAction('discount');
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/discounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: Number(discount.placeId), discountText: discount.discountText }) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (t('adm_192')));
      setDiscount({ placeId: '', discountText: '' });
      const discountResponse = await fetch(`/api/admin/users/${selected.id}/discounts`);
      const discountBody = await readJson(discountResponse);
      setDiscounts(discountBody.data || []);
      setMsg(t('adm_193'));
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteDiscount(placeId: number) {
    if (!selected || busyAction) return;
    setBusyAction('discount');
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/discounts?placeId=${placeId}`, { method: 'DELETE' });
      if (!res.ok) return setMsg(t('adm_194'));
      setDiscounts((current) => current.filter((item) => item.place.id !== placeId));
      setMsg(t('adm_195'));
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  async function importCsv() {
    if (!csvFile) return setMsg(t('adm_118'));
    if (busyAction) return;
    setBusyAction('import');
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('validUntil', csvValidUntil);
      const res = await fetch('/api/admin/users/import', { method: 'POST', body: fd });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (t('adm_119')));
      setMsg(isArabic ? `تم إنشاء ${body.data?.created || 0} مستخدم` : `${body.data?.created || 0} users created`);
      setCsvFile(null);
      closePanel();
      await load();
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  async function bulk(action: 'activate' | 'deactivate' | 'delete') {
    const ids = Array.from(selectedIds);
    if (!ids.length || busyAction) return;
    if (action === 'delete' && !confirm(isArabic ? `حذف ${ids.length} مستخدم؟` : `Delete ${ids.length} users?`)) return;
    setBusyAction('bulk');
    try {
      const failedIds: string[] = [];
      for (const id of ids) {
        const response = await fetch(`/api/admin/users/${id}`, action === 'delete' ? { method: 'DELETE' } : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: action === 'activate' }) });
        if (!response.ok) failedIds.push(id);
      }
      setSelectedIds(new Set(failedIds));
      setMsg(failedIds.length
        ? (isArabic ? `تعذر تنفيذ العملية على ${failedIds.length} من المستخدمين المحددين` : `The action failed for ${failedIds.length} selected users`)
        : (t('adm_88')));
      await load();
    } catch {
      setMsg(t('adm_184'));
    } finally {
      setBusyAction(null);
    }
  }

  const drawerAnchor = language === 'ar' ? 'left' : 'right';

  return <>
    <Card className="rg-panel-card rg-admin-directory-header"><CardContent sx={{ p: { xs: 2, sm: 2.7 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}><Box><Typography variant="h5" fontWeight={950}>{t('users')}</Typography><Typography color="text.secondary" fontSize={13}>{t('adm_197')}</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={(e) => openCards(e, '/api/admin/users/cards-pdf')}>{t('adm_198')}</Button><Button variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={(e) => openCards(e, '/api/admin/users/back-cards-pdf')}>{t('adm_backcards')}</Button><Button variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={() => { setCardNumbersInput(''); setCardsByNumberOpen(true); }}>{isArabic ? 'كروت بأرقام محددة' : 'Cards by numbers'}</Button><Button variant="outlined" component="a" href="/admin/exports" startIcon={<FileDownloadRoundedIcon />}>{t('adm_199')}</Button><Button type="button" variant="outlined" onClick={() => { setMsg(''); setPanel('tools'); }} startIcon={<UploadFileRoundedIcon />}>{t('adm_165')}</Button><Button type="button" variant="contained" className="rg-royal-button" startIcon={<PersonAddAltRoundedIcon />} onClick={() => { setMsg(''); setPanel('create'); }}>{t('adm_200')}</Button></Stack></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}><AdminTextField size="small" placeholder={t('adm_201')} value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} /><Chip label={`${total} ${t('adm_202')}`} /></Stack>
      <Stack direction="row" spacing={.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.4 }}><Checkbox disabled={busyAction === 'bulk'} checked={users.length > 0 && users.every((user) => selectedIds.has(user.id))} indeterminate={users.some((user) => selectedIds.has(user.id)) && !users.every((user) => selectedIds.has(user.id))} onChange={(event) => setSelectedIds(event.target.checked ? new Set([...Array.from(selectedIds), ...users.map((user) => user.id)]) : new Set(Array.from(selectedIds).filter((id) => !users.some((user) => user.id === id))))} /><Typography fontSize={13} fontWeight={900}>{t('adm_90')}</Typography>{selectedIds.size > 0 && <><Button size="small" variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={() => window.open(`/api/admin/users/cards-pdf?ids=${encodeURIComponent(Array.from(selectedIds).join(','))}&download=1`, '_blank', 'noopener,noreferrer')}>{t('adm_203')}</Button><Button size="small" variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={() => window.open(`/api/admin/users/back-cards-pdf?ids=${encodeURIComponent(Array.from(selectedIds).join(','))}&download=1`, '_blank', 'noopener,noreferrer')}>{t('adm_backcards')}</Button><Button size="small" color="success" variant="outlined" disabled={busyAction === 'bulk'} onClick={() => bulk('activate')}>{t('adm_91')}</Button><Button size="small" color="warning" variant="outlined" disabled={busyAction === 'bulk'} onClick={() => bulk('deactivate')}>{t('adm_92')}</Button><Button size="small" color="error" variant="outlined" disabled={busyAction === 'bulk'} onClick={() => bulk('delete')}>{t('delete')}</Button></>}</Stack>
    </CardContent></Card>
    <Grid container spacing={1.5} className="rg-admin-directory-grid" sx={{ mt: .2 }}>{users.map((user, index) => { const state = userSecurityState(user, isArabic); return <Grid item xs={6} sm={4} md={3} lg={2} key={user.id}><Card className="rg-admin-name-card rg-logo-intro" style={{ '--rg-logo-delay': `${(index % 12) * 45}ms` } as React.CSSProperties}><CardContent sx={{ p: 1.2, position: 'relative' }}><Checkbox size="small" checked={selectedIds.has(user.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); next.has(user.id) ? next.delete(user.id) : next.add(user.id); return next; })} sx={{ position: 'absolute', top: 2, right: 2 }} /><Tooltip title={user.fullName}><Box component="button" type="button" className="rg-admin-name-button" onClick={() => openEdit(user)}><Box className="rg-admin-user-avatar">{initials(user.fullName)}</Box><Typography className="rg-admin-name-text">{user.fullName}</Typography><Chip size="small" label={state.label} color={state.color} /></Box></Tooltip><Button type="button" size="small" fullWidth startIcon={<EditRoundedIcon />} onClick={() => openEdit(user)}>{t('details')}</Button></CardContent></Card></Grid>; })}{!users.length && <Grid item xs={12}><Card className="rg-panel-card"><CardContent><Typography align="center" color="text.secondary">{t('adm_142')}</Typography></CardContent></Card></Grid>}</Grid>
    {totalPages > 1 && <Stack alignItems="center" className="rg-admin-pagination" sx={{ mt: 3 }}><Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" /></Stack>}

    <AdminSidePanel open={panel === 'create'} anchor={drawerAnchor} onClose={closePanel} title={t('adm_204')}>
      <Stack component="form" onSubmit={createUser} spacing={2} className="rg-admin-edit-drawer rg-user-editor rg-user-editor-create" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box className="rg-user-editor-intro">
          <Typography className="rg-user-editor-eyebrow">{t('adm_205')}</Typography>
          <Typography variant="h5" fontWeight={950}>{t('adm_206')}</Typography>
          <Typography color="text.secondary" fontSize={13}>{t('adm_207')}</Typography>
        </Box>
        {msg && <Alert severity={messageIsError ? 'error' : 'success'} onClose={() => setMsg('')} sx={{ fontWeight: 850 }}>{msg}</Alert>}
        <section className="rg-user-form-section">
          <div className="rg-user-section-heading"><Typography fontWeight={950}>{t('adm_208')}</Typography><Typography color="text.secondary" fontSize={12}>{t('adm_209')}</Typography></div>
          <div className="rg-user-form-grid">
            <UserEditorField className="rg-user-form-field-wide" label={t('adm_210')} value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} required />
            <UserEditorField label={t('adm_211')} value={createForm.idNumber} onChange={(e) => setCreateForm({ ...createForm, idNumber: e.target.value })} required />
            <UserEditorField label={t('adm_212')} value={createForm.cardNumber} onChange={(e) => setCreateForm({ ...createForm, cardNumber: e.target.value })} />
          </div>
        </section>
        <section className="rg-user-form-section">
          <div className="rg-user-section-heading"><Typography fontWeight={950}>{t('adm_213')}</Typography><Typography color="text.secondary" fontSize={12}>{t('adm_214')}</Typography></div>
          <div className="rg-user-form-grid">
            <UserPasswordField
              label={t('adm_71')}
              isArabic={isArabic}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              required
            />
            <UserPasswordField label={t('adm_72')} isArabic={isArabic} value={createPasswordConfirm} onChange={(e) => setCreatePasswordConfirm(e.target.value)} required />
            <div className="rg-user-form-field-wide"><PasswordStrength value={createForm.password} confirmValue={createPasswordConfirm} language={language} required /></div>
          </div>
        </section>
        <section className="rg-user-form-section">
          <div className="rg-user-section-heading"><Typography fontWeight={950}>{t('adm_215')}</Typography></div>
          <div className="rg-user-form-grid">
            <UserEditorSelect label={t('adm_216')} value={createForm.membershipClass} onChange={(value) => setCreateForm({ ...createForm, membershipClass: value })}>
              {MEMBERSHIP_CLASSES.map((membership) => <MenuItem key={membership} value={membership}>{membership}</MenuItem>)}
            </UserEditorSelect>
            <UserEditorField label={t('adm_217')} type="date" value={createForm.validUntil} onChange={(e) => setCreateForm({ ...createForm, validUntil: e.target.value })} />
            <div className="rg-user-form-field-wide"><AdminActionToggle checked={createForm.mustChangePassword} onChange={(checked) => setCreateForm({ ...createForm, mustChangePassword: checked })} label={t('adm_218')} disabled={busyAction !== null} /></div>
          </div>
        </section>
        <Stack direction="row" spacing={1} className="rg-user-editor-footer">
          <Button className="rg-royal-button" type="submit" variant="contained" startIcon={busyAction === 'create' ? <CircularProgress size={18} color="inherit" /> : <AddRoundedIcon />} disabled={busyAction !== null}>
            {busyAction === 'create' ? (t('adm_219')) : (t('adm_220'))}
          </Button>
          <Button type="button" variant="outlined" onClick={closePanel}>{t('adm_80')}</Button>
        </Stack>
      </Stack>
    </AdminSidePanel>

    <AdminSidePanel open={panel === 'edit'} anchor={drawerAnchor} onClose={closePanel} title={t('adm_221')}>
      {selected && <Stack spacing={1.5} className="rg-admin-edit-drawer rg-user-editor rg-user-editor-edit" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box className="rg-user-identity-header">
          <Box className="rg-admin-user-avatar">{initials(selected.fullName)}</Box>
          <Box className="rg-user-identity-copy">
            <Typography className="rg-user-editor-eyebrow">{t('adm_222')}</Typography>
            <Typography variant="h5" fontWeight={950} className="rg-user-identity-name">{selected.fullName}</Typography>
            <Typography color="text.secondary" fontSize={13}>{isArabic ? `رقم تعريفي: ${selected.idNumber}` : `ID: ${selected.idNumber}`}</Typography>
          </Box>
          <Button className="rg-user-card-link" component="a" target="_blank" href={`/admin/users/${selected.id}/card`} aria-label={t('adm_223')} title={t('adm_224')} startIcon={<CreditCardRoundedIcon />}>{t('adm_225')}</Button>
        </Box>
        <div className="rg-user-editor-tabs" role="group" aria-label={t('adm_226')}>
          <button type="button" aria-pressed={editTab === 'profile'} className={editTab === 'profile' ? 'rg-user-editor-tab rg-user-editor-tab-active' : 'rg-user-editor-tab'} onClick={() => setEditTab('profile')}>{t('adm_227')}</button>
          <button type="button" aria-pressed={editTab === 'benefits'} className={editTab === 'benefits' ? 'rg-user-editor-tab rg-user-editor-tab-active' : 'rg-user-editor-tab'} onClick={() => setEditTab('benefits')}><LocalOfferRoundedIcon fontSize="small" />{t('adm_228')}</button>
        </div>
        {msg && <Alert severity={messageIsError ? 'error' : 'success'} onClose={() => setMsg('')} sx={{ fontWeight: 850 }}>{msg}</Alert>}
        {editTab === 'profile' ? <>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{t('adm_229')}</Typography></div>
            <div className="rg-user-form-grid">
              <UserEditorField className="rg-user-form-field-wide" label={t('adm_210')} value={edit.fullName || ''} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} />
              <UserEditorField label={t('adm_211')} value={edit.idNumber || ''} onChange={(e) => setEdit({ ...edit, idNumber: e.target.value })} />
              <UserEditorField label={t('adm_230')} value={edit.cardNumber || ''} onChange={(e) => setEdit({ ...edit, cardNumber: e.target.value })} />
            </div>
          </section>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{t('adm_231')}</Typography></div>
            <div className="rg-user-form-grid">
              <UserEditorSelect label={t('adm_216')} value={edit.membershipClass || 'Regular'} onChange={(value) => setEdit({ ...edit, membershipClass: value })}>
                {MEMBERSHIP_CLASSES.map((membership) => <MenuItem key={membership} value={membership}>{membership}</MenuItem>)}
              </UserEditorSelect>
              <UserEditorField label={t('adm_217')} type="date" value={String(edit.validUntil || '')} onChange={(e) => setEdit({ ...edit, validUntil: e.target.value })} />
            </div>
          </section>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{t('adm_232')}</Typography><Typography color="text.secondary" fontSize={12}>{t('adm_233')}</Typography></div>
            <AdminActionToggle checked={resetPasswordMode} onChange={(checked) => { setResetPasswordMode(checked); if (!checked) { setEdit((current) => ({ ...current, password: '' })); setEditPasswordConfirm(''); } }} label={t('adm_234')} disabled={busyAction !== null} />
            {resetPasswordMode && <div className="rg-user-form-grid rg-user-password-fields">
              <UserPasswordField
                label={t('mem_45')}
                isArabic={isArabic}
                value={edit.password || ''}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
              <UserPasswordField label={t('adm_75')} isArabic={isArabic} value={editPasswordConfirm} onChange={(e) => setEditPasswordConfirm(e.target.value)} />
              <div className="rg-user-form-field-wide"><PasswordStrength value={edit.password || ''} confirmValue={editPasswordConfirm} language={language} /></div>
            </div>}
            <div className="rg-user-account-toggles">
              <AdminActionToggle checked={Boolean(edit.isActive)} onChange={(checked) => setEdit({ ...edit, isActive: checked })} label={t('adm_76')} disabled={busyAction !== null} />
              <AdminActionToggle checked={Boolean(edit.mustChangePassword)} onChange={(checked) => setEdit({ ...edit, mustChangePassword: checked })} label={t('adm_235')} disabled={busyAction !== null} />
            </div>
          </section>
          <section className="rg-user-account-actions" aria-label={t('adm_236')}>
            <Button variant="outlined" color={selected.isActive ? 'warning' : 'success'} onClick={() => void toggleUserStatus()} startIcon={busyAction === 'status' ? <CircularProgress size={18} /> : (selected.isActive ? <LockRoundedIcon /> : <LockOpenRoundedIcon />)} disabled={busyAction !== null}>{selected.isActive ? (t('adm_237')) : (t('adm_238'))}</Button>
            <Button variant="text" color="error" onClick={() => removeUser(selected)} startIcon={<DeleteRoundedIcon />} disabled={busyAction !== null}>{t('delete')}</Button>
          </section>
        </> : <>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{t('adm_239')}</Typography><Typography color="text.secondary" fontSize={12}>{t('adm_240')}</Typography></div>
            <div className="rg-user-form-grid rg-user-discount-form">
              <UserEditorSelect label={t('adm_241')} value={discount.placeId} onChange={(value) => setDiscount({ ...discount, placeId: value })}>
                {places.map((place) => <MenuItem key={place.id} value={place.id}>{place.name}</MenuItem>)}
              </UserEditorSelect>
              <UserEditorField label={t('adm_242')} value={discount.discountText} onChange={(e) => setDiscount({ ...discount, discountText: e.target.value })} />
              <Button className="rg-user-discount-save" variant="outlined" onClick={() => void saveDiscount()} disabled={busyAction !== null || !discount.placeId || !discount.discountText} startIcon={busyAction === 'discount' ? <CircularProgress size={18} /> : <AddRoundedIcon />}>{t('adm_243')}</Button>
            </div>
            <div className="rg-user-discount-list">
              {discounts.length ? <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>{discounts.map((item) => <Chip key={item.id} label={`${item.place.name}: ${item.discountText}`} onDelete={busyAction ? undefined : () => deleteDiscount(item.place.id)} />)}</Stack> : <Typography color="text.secondary" fontSize={13}>{t('adm_244')}</Typography>}
            </div>
          </section>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading rg-user-activity-heading">
              <Box><Typography fontWeight={950}>{t('userActivityLogs')}</Typography><Typography color="text.secondary" fontSize={12}>{t('adm_245')}</Typography></Box>
              <Button type="button" size="small" onClick={() => void loadDetails()} startIcon={busyAction === 'details' ? <CircularProgress size={16} /> : <HistoryRoundedIcon />} disabled={busyAction !== null}>{t('adm_246')}</Button>
            </div>
            {logs.length ? <Box className="rg-user-log-panel">{logs.map((log) => <Box key={log.id} className="rg-user-log-entry"><Typography fontSize={12} fontWeight={800}>{log.action}</Typography><Typography color="text.secondary" fontSize={11}>{new Date(log.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB')}</Typography></Box>)}</Box> : <Typography className="rg-user-empty-state" color="text.secondary" fontSize={13}>{t('adm_247')}</Typography>}
          </section>
        </>}
        {editTab === 'profile' && <Stack direction="row" spacing={1} className="rg-user-editor-footer">
          <Button className="rg-royal-button" type="button" fullWidth variant="contained" onClick={() => void saveUser()} startIcon={busyAction === 'save' ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />} disabled={busyAction !== null}>
            {busyAction === 'save' ? (t('adm_248')) : t('save')}
          </Button>
          <Button type="button" variant="outlined" onClick={closePanel}>{t('adm_249')}</Button>
        </Stack>}
      </Stack>}
    </AdminSidePanel>

    <AdminSidePanel open={panel === 'tools'} anchor={drawerAnchor} onClose={closePanel} title={t('adm_250')}>
      <Stack spacing={1.5} className="rg-admin-edit-drawer" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={950}>{t('adm_251')}</Typography>
        <Typography color="text.secondary" fontSize={13}>name, idNumber, password, membershipClass, vip</Typography>
        <Button component="a" href="/api/admin/users/import" download variant="outlined" color="secondary" startIcon={<FileDownloadRoundedIcon />}>{t('adm_164')}</Button>
        <AdminTextField label={t('adm_252')} type="date" value={csvValidUntil} onChange={(e) => setCsvValidUntil(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />} disabled={busyAction !== null}>{csvFile?.name || 'CSV'}<input hidden type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] || null)} /></Button>
        <Button type="button" variant="contained" disabled={!csvFile || busyAction !== null} onClick={() => void importCsv()} startIcon={busyAction === 'import' ? <CircularProgress size={18} color="inherit" /> : <UploadFileRoundedIcon />}>{busyAction === 'import' ? (t('adm_253')) : (t('adm_165'))}</Button>
        <Button type="button" variant="text" onClick={closePanel} startIcon={<CloseRoundedIcon />}>{t('adm_249')}</Button>
      </Stack>
    </AdminSidePanel>

    <Snackbar
      open={Boolean(msg)}
      autoHideDuration={6500}
      onClose={(_, reason) => { if (reason !== 'clickaway') setMsg(''); }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
    >
      <Alert severity={messageIsError ? 'error' : 'success'} variant="filled" onClose={() => setMsg('')} sx={{ width: '100%', fontWeight: 850 }}>{msg}</Alert>
    </Snackbar>
    <Menu anchorEl={cardsMenu?.anchor} open={Boolean(cardsMenu)} onClose={() => setCardsMenu(null)}>
      <MenuItem disabled dense>{isArabic ? `التحميل على دفعات (${CARDS_BATCH} لكل ملف)` : `Download in batches of ${CARDS_BATCH}`}</MenuItem>
      {Array.from({ length: cardBatches }).map((_, i) => {
        const from = i * CARDS_BATCH;
        return (
          <MenuItem key={i} onClick={() => { window.open(`${cardsMenu!.endpoint}?includeInactive=1&download=1&skip=${from}`, '_blank', 'noopener,noreferrer'); setCardsMenu(null); }}>
            {isArabic ? `البطاقات ${from + 1} - ${Math.min(from + CARDS_BATCH, total)}` : `Cards ${from + 1} - ${Math.min(from + CARDS_BATCH, total)}`}
          </MenuItem>
        );
      })}
    </Menu>
    <Dialog open={cardsByNumberOpen} onClose={() => setCardsByNumberOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 950 }}>{isArabic ? 'إنشاء كروت بأرقام محددة' : 'Generate cards by numbers'}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" fontSize={13} sx={{ mb: 1.5 }}>
          {isArabic ? 'الصق أرقام الكروت أو الأرقام التعريفية (مفصولة بفاصلة أو سطر). حتى 500 رقم في الملف الواحد.' : 'Paste card numbers or ID numbers (separated by comma or new line). Up to 500 per file.'}
        </Typography>
        <AdminTextField
          noExpand
          fullWidth
          multiline
          minRows={5}
          label={isArabic ? 'أرقام الكروت' : 'Card numbers'}
          value={cardNumbersInput}
          onChange={(e) => setCardNumbersInput(e.target.value)}
          placeholder={'3320568\n1026179\n...'}
        />
        <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
          {isArabic ? `عدد الأرقام: ${parsedCardNumbers.length}` : `Numbers entered: ${parsedCardNumbers.length}`}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={() => setCardsByNumberOpen(false)}>{t('adm_80')}</Button>
        <Button variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} disabled={!parsedCardNumbers.length} onClick={() => downloadByNumbers('/api/admin/users/cards-pdf')}>{isArabic ? 'كروت الوجه PDF' : 'Front cards PDF'}</Button>
        <Button variant="contained" className="rg-royal-button" startIcon={<PictureAsPdfRoundedIcon />} disabled={!parsedCardNumbers.length} onClick={() => downloadByNumbers('/api/admin/users/back-cards-pdf')}>{isArabic ? 'كروت الظهر PDF' : 'Back cards PDF'}</Button>
      </DialogActions>
    </Dialog>
    <ConfirmActionDialog
      open={Boolean(pendingDelete)}
      title={t('adm_254')}
      description={pendingDelete ? (isArabic ? `سيتم حذف المستخدم ${pendingDelete.fullName} نهائيًا.` : `This permanently deletes ${pendingDelete.fullName}.`) : ''}
      confirmLabel={t('adm_255')}
      cancelLabel={t('adm_80')}
      onClose={() => setPendingDelete(null)}
      onConfirm={confirmDeleteUser}
    />
  </>;
}
