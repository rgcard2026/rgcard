'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import AdminTextField, { type AdminTextFieldProps } from '@/components/AdminTextField';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Divider, FormControl, Grid, IconButton, InputAdornment, MenuItem, Pagination, Select, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
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
function passwordMessage(isArabic: boolean) { return isArabic ? 'استخدم كلمة مرور قوية ومتطابقة (8 أحرف على الأقل مع رقم ورمز).' : 'Use a strong matching password (8+ characters with a number and symbol).'; }


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
  if (user.expiredAt || (user.validUntil && new Date(user.validUntil) < new Date())) return { label: isArabic ? 'منتهي' : 'Expired', color: 'error' as const };
  if (user.lockedAt || !user.isActive) return { label: isArabic ? 'موقوف' : 'Inactive', color: 'error' as const };
  if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) return { label: isArabic ? 'محظور مؤقتًا' : 'Temporarily blocked', color: 'warning' as const };
  return { label: isArabic ? 'نشط' : 'Active', color: 'success' as const };
}

export default function AdminUsersClient() {
  const { language, t } = useUiPreferences(); const isArabic = language === 'ar';
  const [users, setUsers] = React.useState<User[]>([]); const [places, setPlaces] = React.useState<PlaceOption[]>([]);
  const [total, setTotal] = React.useState(0); const [q, setQ] = React.useState(''); const [page, setPage] = React.useState(1); const pageSize = 12;
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
    if (!usersResponse.ok) setMsg(usersBody.message || (isArabic ? 'تعذر تحميل المستخدمين' : 'Unable to load users'));
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
    if (!isStrongEnough(createForm.password) || createForm.password !== createPasswordConfirm) return setMsg(passwordMessage(isArabic));
    setBusyAction('create');
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...createForm, isVip: createForm.membershipClass === 'VIP' }) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر إضافة المستخدم' : 'Unable to add user'));
      setCreateForm({ ...createForm, fullName: '', idNumber: '', cardNumber: '', password: '' });
      setCreatePasswordConfirm('');
      closePanel();
      setMsg(isArabic ? 'تمت إضافة المستخدم بنجاح' : 'User added successfully');
      await load();
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
    } finally {
      setBusyAction(null);
    }
  }

  async function saveUser() {
    if (!selected || busyAction) return;
    if (resetPasswordMode && (!edit.password || !isStrongEnough(edit.password) || edit.password !== editPasswordConfirm)) return setMsg(passwordMessage(isArabic));
    setBusyAction('save');
    try {
      const payload = { ...edit, isVip: edit.membershipClass === 'VIP' } as EditState & { isVip?: boolean };
      if (!resetPasswordMode) delete payload.password;
      const res = await fetch(`/api/admin/users/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر الحفظ' : 'Unable to save'));
      setEditPasswordConfirm('');
      setResetPasswordMode(false);
      setEdit((current) => ({ ...current, password: '' }));
      await load();
      closePanel();
      setMsg(resetPasswordMode ? (isArabic ? 'تم حفظ البيانات وتغيير كلمة المرور بنجاح' : 'Details and password updated successfully') : (isArabic ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully'));
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
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
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر الحذف' : 'Unable to delete'));
      closePanel();
      setSelected(null);
      setPendingDelete(null);
      setMsg(isArabic ? 'تم حذف المستخدم' : 'User deleted');
      await load();
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
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
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر تغيير حالة الحساب' : 'Unable to change account status'));
      setEdit((current) => ({ ...current, isActive: nextActive }));
      setSelected((current) => current ? { ...current, isActive: nextActive, ...(nextActive ? { lockedAt: null, blockedUntil: null } : {}) } : current);
      await load();
      closePanel();
      setMsg(nextActive ? (isArabic ? 'تم تشغيل الحساب بنجاح' : 'Account activated successfully') : (isArabic ? 'تم إيقاف الحساب بنجاح' : 'Account deactivated successfully'));
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
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
      if (!discountResponse.ok || !logResponse.ok) return setMsg(isArabic ? 'تعذر تحديث السجل' : 'Unable to refresh activity');
      setDiscounts(discountBody.data || []);
      setLogs(logBody.data || []);
      setMsg(isArabic ? 'تم تحديث السجل' : 'Activity refreshed');
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
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
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر حفظ الخصم' : 'Unable to save discount'));
      setDiscount({ placeId: '', discountText: '' });
      const discountResponse = await fetch(`/api/admin/users/${selected.id}/discounts`);
      const discountBody = await readJson(discountResponse);
      setDiscounts(discountBody.data || []);
      setMsg(isArabic ? 'تم حفظ الخصم' : 'Discount saved');
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteDiscount(placeId: number) {
    if (!selected || busyAction) return;
    setBusyAction('discount');
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/discounts?placeId=${placeId}`, { method: 'DELETE' });
      if (!res.ok) return setMsg(isArabic ? 'تعذر حذف الخصم' : 'Unable to delete discount');
      setDiscounts((current) => current.filter((item) => item.place.id !== placeId));
      setMsg(isArabic ? 'تم حذف الخصم' : 'Discount removed');
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
    } finally {
      setBusyAction(null);
    }
  }

  async function importCsv() {
    if (!csvFile) return setMsg(isArabic ? 'اختر ملف CSV أولًا' : 'Choose a CSV file first');
    if (busyAction) return;
    setBusyAction('import');
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('validUntil', csvValidUntil);
      const res = await fetch('/api/admin/users/import', { method: 'POST', body: fd });
      const body = await readJson(res);
      if (!res.ok) return setMsg(body.message || (isArabic ? 'تعذر الاستيراد' : 'Import failed'));
      setMsg(isArabic ? `تم إنشاء ${body.data?.created || 0} مستخدم` : `${body.data?.created || 0} users created`);
      setCsvFile(null);
      closePanel();
      await load();
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
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
        : (isArabic ? 'تم تنفيذ العملية' : 'Action completed'));
      await load();
    } catch {
      setMsg(isArabic ? 'تعذر الاتصال بالخادم' : 'Unable to reach the server');
    } finally {
      setBusyAction(null);
    }
  }

  const drawerAnchor = language === 'ar' ? 'right' : 'left';

  return <>
    <Card className="rg-panel-card rg-admin-directory-header"><CardContent sx={{ p: { xs: 2, sm: 2.7 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}><Box><Typography variant="h5" fontWeight={950}>{t('users')}</Typography><Typography color="text.secondary" fontSize={13}>{isArabic ? 'عرض مختصر بالأسماء فقط. افتح الاسم لمراجعة الكارت، البيانات، والخصومات داخل لوحة جانبية.' : 'A compact names-only directory. Open a name to manage the card, details, and personal discounts in a side panel.'}</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" component="a" href="/api/admin/users/cards-pdf?includeInactive=1" target="_blank" startIcon={<PictureAsPdfRoundedIcon />}>{isArabic ? 'كل الكروت PDF' : 'All cards PDF'}</Button><Button variant="outlined" component="a" href="/admin/exports" startIcon={<FileDownloadRoundedIcon />}>{isArabic ? 'التصدير' : 'Exports'}</Button><Button type="button" variant="outlined" onClick={() => { setMsg(''); setPanel('tools'); }} startIcon={<UploadFileRoundedIcon />}>{isArabic ? 'استيراد' : 'Import'}</Button><Button type="button" variant="contained" className="rg-royal-button" startIcon={<PersonAddAltRoundedIcon />} onClick={() => { setMsg(''); setPanel('create'); }}>{isArabic ? 'إضافة مستخدم' : 'Add user'}</Button></Stack></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}><AdminTextField size="small" placeholder={isArabic ? 'بحث بالاسم أو رقم الكارت أو ID...' : 'Search name, card, or ID...'} value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} /><Chip label={`${total} ${isArabic ? 'مستخدم' : 'users'}`} /></Stack>
      <Stack direction="row" spacing={.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.4 }}><Checkbox disabled={busyAction === 'bulk'} checked={users.length > 0 && users.every((user) => selectedIds.has(user.id))} indeterminate={users.some((user) => selectedIds.has(user.id)) && !users.every((user) => selectedIds.has(user.id))} onChange={(event) => setSelectedIds(event.target.checked ? new Set([...Array.from(selectedIds), ...users.map((user) => user.id)]) : new Set(Array.from(selectedIds).filter((id) => !users.some((user) => user.id === id))))} /><Typography fontSize={13} fontWeight={900}>{isArabic ? 'اختيار الظاهر' : 'Select visible'}</Typography>{selectedIds.size > 0 && <><Button size="small" variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={() => window.open(`/api/admin/users/cards-pdf?ids=${encodeURIComponent(Array.from(selectedIds).join(','))}&download=1`, '_blank', 'noopener,noreferrer')}>{isArabic ? 'PDF للمختار' : 'Selected PDF'}</Button><Button size="small" color="success" variant="outlined" disabled={busyAction === 'bulk'} onClick={() => bulk('activate')}>{isArabic ? 'تفعيل' : 'Activate'}</Button><Button size="small" color="warning" variant="outlined" disabled={busyAction === 'bulk'} onClick={() => bulk('deactivate')}>{isArabic ? 'إيقاف' : 'Pause'}</Button><Button size="small" color="error" variant="outlined" disabled={busyAction === 'bulk'} onClick={() => bulk('delete')}>{t('delete')}</Button></>}</Stack>
    </CardContent></Card>
    <Grid container spacing={1.5} className="rg-admin-directory-grid" sx={{ mt: .2 }}>{users.map((user, index) => { const state = userSecurityState(user, isArabic); return <Grid item xs={6} sm={4} md={3} lg={2} key={user.id}><Card className="rg-admin-name-card rg-logo-intro" style={{ '--rg-logo-delay': `${(index % 12) * 45}ms` } as React.CSSProperties}><CardContent sx={{ p: 1.2, position: 'relative' }}><Checkbox size="small" checked={selectedIds.has(user.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); next.has(user.id) ? next.delete(user.id) : next.add(user.id); return next; })} sx={{ position: 'absolute', top: 2, right: 2 }} /><Tooltip title={user.fullName}><Box component="button" type="button" className="rg-admin-name-button" onClick={() => openEdit(user)}><Box className="rg-admin-user-avatar">{initials(user.fullName)}</Box><Typography className="rg-admin-name-text">{user.fullName}</Typography><Chip size="small" label={state.label} color={state.color} /></Box></Tooltip><Button type="button" size="small" fullWidth startIcon={<EditRoundedIcon />} onClick={() => openEdit(user)}>{t('details')}</Button></CardContent></Card></Grid>; })}{!users.length && <Grid item xs={12}><Card className="rg-panel-card"><CardContent><Typography align="center" color="text.secondary">{isArabic ? 'لا توجد نتائج.' : 'No results found.'}</Typography></CardContent></Card></Grid>}</Grid>
    {totalPages > 1 && <Stack alignItems="center" className="rg-admin-pagination" sx={{ mt: 3 }}><Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" /></Stack>}

    <AdminSidePanel open={panel === 'create'} anchor={drawerAnchor} onClose={closePanel} title={isArabic ? 'إغلاق إضافة المستخدم' : 'Close add user'}>
      <Stack component="form" onSubmit={createUser} spacing={2} className="rg-admin-edit-drawer rg-user-editor rg-user-editor-create" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box className="rg-user-editor-intro">
          <Typography className="rg-user-editor-eyebrow">{isArabic ? 'عضوية جديدة' : 'NEW MEMBERSHIP'}</Typography>
          <Typography variant="h5" fontWeight={950}>{isArabic ? 'إضافة مستخدم وكارت' : 'Add user & card'}</Typography>
          <Typography color="text.secondary" fontSize={13}>{isArabic ? 'أدخل البيانات الأساسية، ثم حدّد صلاحية وفئة العضوية.' : 'Enter the member details, then set their membership and access.'}</Typography>
        </Box>
        {msg && <Alert severity={messageIsError ? 'error' : 'success'} onClose={() => setMsg('')} sx={{ fontWeight: 850 }}>{msg}</Alert>}
        <section className="rg-user-form-section">
          <div className="rg-user-section-heading"><Typography fontWeight={950}>{isArabic ? 'بيانات المستخدم' : 'Member details'}</Typography><Typography color="text.secondary" fontSize={12}>{isArabic ? 'الاسم والرقم التعريفي مطلوبان.' : 'Name and ID are required.'}</Typography></div>
          <div className="rg-user-form-grid">
            <UserEditorField className="rg-user-form-field-wide" label={isArabic ? 'الاسم بالكامل' : 'Full name'} value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} required />
            <UserEditorField label={isArabic ? 'الرقم التعريفي' : 'ID number'} value={createForm.idNumber} onChange={(e) => setCreateForm({ ...createForm, idNumber: e.target.value })} required />
            <UserEditorField label={isArabic ? 'رقم الكارت (اختياري)' : 'Card number (optional)'} value={createForm.cardNumber} onChange={(e) => setCreateForm({ ...createForm, cardNumber: e.target.value })} />
          </div>
        </section>
        <section className="rg-user-form-section">
          <div className="rg-user-section-heading"><Typography fontWeight={950}>{isArabic ? 'بيانات الدخول' : 'Sign-in details'}</Typography><Typography color="text.secondary" fontSize={12}>{isArabic ? 'كلمة مرور قوية تحمي حساب العضو.' : 'A strong password helps protect the member account.'}</Typography></div>
          <div className="rg-user-form-grid">
            <UserPasswordField
              label={isArabic ? 'كلمة المرور' : 'Password'}
              isArabic={isArabic}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              required
            />
            <UserPasswordField label={isArabic ? 'تأكيد كلمة المرور' : 'Confirm password'} isArabic={isArabic} value={createPasswordConfirm} onChange={(e) => setCreatePasswordConfirm(e.target.value)} required />
            <div className="rg-user-form-field-wide"><PasswordStrength value={createForm.password} confirmValue={createPasswordConfirm} language={language} required /></div>
          </div>
        </section>
        <section className="rg-user-form-section">
          <div className="rg-user-section-heading"><Typography fontWeight={950}>{isArabic ? 'العضوية والصلاحية' : 'Membership & access'}</Typography></div>
          <div className="rg-user-form-grid">
            <UserEditorSelect label={isArabic ? 'فئة العضوية' : 'Membership class'} value={createForm.membershipClass} onChange={(value) => setCreateForm({ ...createForm, membershipClass: value })}>
              {MEMBERSHIP_CLASSES.map((membership) => <MenuItem key={membership} value={membership}>{membership}</MenuItem>)}
            </UserEditorSelect>
            <UserEditorField label={isArabic ? 'صالح حتى' : 'Valid until'} type="date" value={createForm.validUntil} onChange={(e) => setCreateForm({ ...createForm, validUntil: e.target.value })} />
            <div className="rg-user-form-field-wide"><AdminActionToggle checked={createForm.mustChangePassword} onChange={(checked) => setCreateForm({ ...createForm, mustChangePassword: checked })} label={isArabic ? 'طلب تغيير كلمة المرور عند أول دخول' : 'Require a password change on first login'} disabled={busyAction !== null} /></div>
          </div>
        </section>
        <Stack direction="row" spacing={1} className="rg-user-editor-footer">
          <Button className="rg-royal-button" type="submit" variant="contained" startIcon={busyAction === 'create' ? <CircularProgress size={18} color="inherit" /> : <AddRoundedIcon />} disabled={busyAction !== null}>
            {busyAction === 'create' ? (isArabic ? 'جارٍ الإضافة…' : 'Adding…') : (isArabic ? 'إنشاء المستخدم' : 'Create user')}
          </Button>
          <Button type="button" variant="outlined" onClick={closePanel}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
        </Stack>
      </Stack>
    </AdminSidePanel>

    <AdminSidePanel open={panel === 'edit'} anchor={drawerAnchor} onClose={closePanel} title={isArabic ? 'إغلاق تعديل المستخدم' : 'Close edit user'}>
      {selected && <Stack spacing={1.5} className="rg-admin-edit-drawer rg-user-editor rg-user-editor-edit" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box className="rg-user-identity-header">
          <Box className="rg-admin-user-avatar">{initials(selected.fullName)}</Box>
          <Box className="rg-user-identity-copy">
            <Typography className="rg-user-editor-eyebrow">{isArabic ? 'إدارة العضو' : 'MEMBER PROFILE'}</Typography>
            <Typography variant="h5" fontWeight={950} className="rg-user-identity-name">{selected.fullName}</Typography>
            <Typography color="text.secondary" fontSize={13}>{isArabic ? `رقم تعريفي: ${selected.idNumber}` : `ID: ${selected.idNumber}`}</Typography>
          </Box>
          <Button className="rg-user-card-link" component="a" target="_blank" href={`/admin/users/${selected.id}/card`} aria-label={isArabic ? 'فتح كارت العضو' : 'Open member card'} title={isArabic ? 'فتح الكارت' : 'Open card'} startIcon={<CreditCardRoundedIcon />}>{isArabic ? 'الكارت' : 'Card'}</Button>
        </Box>
        <div className="rg-user-editor-tabs" role="group" aria-label={isArabic ? 'أقسام بيانات العضو' : 'Member sections'}>
          <button type="button" aria-pressed={editTab === 'profile'} className={editTab === 'profile' ? 'rg-user-editor-tab rg-user-editor-tab-active' : 'rg-user-editor-tab'} onClick={() => setEditTab('profile')}>{isArabic ? 'البيانات والوصول' : 'Profile & access'}</button>
          <button type="button" aria-pressed={editTab === 'benefits'} className={editTab === 'benefits' ? 'rg-user-editor-tab rg-user-editor-tab-active' : 'rg-user-editor-tab'} onClick={() => setEditTab('benefits')}><LocalOfferRoundedIcon fontSize="small" />{isArabic ? 'الخصومات والنشاط' : 'Discounts & activity'}</button>
        </div>
        {msg && <Alert severity={messageIsError ? 'error' : 'success'} onClose={() => setMsg('')} sx={{ fontWeight: 850 }}>{msg}</Alert>}
        {editTab === 'profile' ? <>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{isArabic ? 'البيانات الأساسية' : 'Personal details'}</Typography></div>
            <div className="rg-user-form-grid">
              <UserEditorField className="rg-user-form-field-wide" label={isArabic ? 'الاسم بالكامل' : 'Full name'} value={edit.fullName || ''} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} />
              <UserEditorField label={isArabic ? 'الرقم التعريفي' : 'ID number'} value={edit.idNumber || ''} onChange={(e) => setEdit({ ...edit, idNumber: e.target.value })} />
              <UserEditorField label={isArabic ? 'رقم الكارت' : 'Card number'} value={edit.cardNumber || ''} onChange={(e) => setEdit({ ...edit, cardNumber: e.target.value })} />
            </div>
          </section>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{isArabic ? 'العضوية' : 'Membership'}</Typography></div>
            <div className="rg-user-form-grid">
              <UserEditorSelect label={isArabic ? 'فئة العضوية' : 'Membership class'} value={edit.membershipClass || 'Regular'} onChange={(value) => setEdit({ ...edit, membershipClass: value })}>
                {MEMBERSHIP_CLASSES.map((membership) => <MenuItem key={membership} value={membership}>{membership}</MenuItem>)}
              </UserEditorSelect>
              <UserEditorField label={isArabic ? 'صالح حتى' : 'Valid until'} type="date" value={String(edit.validUntil || '')} onChange={(e) => setEdit({ ...edit, validUntil: e.target.value })} />
            </div>
          </section>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{isArabic ? 'أمان الحساب' : 'Account security'}</Typography><Typography color="text.secondary" fontSize={12}>{isArabic ? 'تغيير كلمة المرور اختياري.' : 'Changing the password is optional.'}</Typography></div>
            <AdminActionToggle checked={resetPasswordMode} onChange={(checked) => { setResetPasswordMode(checked); if (!checked) { setEdit((current) => ({ ...current, password: '' })); setEditPasswordConfirm(''); } }} label={isArabic ? 'تعيين كلمة مرور جديدة' : 'Set a new password'} disabled={busyAction !== null} />
            {resetPasswordMode && <div className="rg-user-form-grid rg-user-password-fields">
              <UserPasswordField
                label={isArabic ? 'كلمة المرور الجديدة' : 'New password'}
                isArabic={isArabic}
                value={edit.password || ''}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
              <UserPasswordField label={isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'} isArabic={isArabic} value={editPasswordConfirm} onChange={(e) => setEditPasswordConfirm(e.target.value)} />
              <div className="rg-user-form-field-wide"><PasswordStrength value={edit.password || ''} confirmValue={editPasswordConfirm} language={language} /></div>
            </div>}
            <div className="rg-user-account-toggles">
              <AdminActionToggle checked={Boolean(edit.isActive)} onChange={(checked) => setEdit({ ...edit, isActive: checked })} label={isArabic ? 'الحساب مفعل' : 'Account active'} disabled={busyAction !== null} />
              <AdminActionToggle checked={Boolean(edit.mustChangePassword)} onChange={(checked) => setEdit({ ...edit, mustChangePassword: checked })} label={isArabic ? 'طلب تغيير كلمة المرور عند الدخول' : 'Require password change on next login'} disabled={busyAction !== null} />
            </div>
          </section>
          <section className="rg-user-account-actions" aria-label={isArabic ? 'إجراءات الحساب' : 'Account actions'}>
            <Button variant="outlined" color={selected.isActive ? 'warning' : 'success'} onClick={() => void toggleUserStatus()} startIcon={busyAction === 'status' ? <CircularProgress size={18} /> : (selected.isActive ? <LockRoundedIcon /> : <LockOpenRoundedIcon />)} disabled={busyAction !== null}>{selected.isActive ? (isArabic ? 'إيقاف الحساب' : 'Deactivate account') : (isArabic ? 'تشغيل الحساب' : 'Activate account')}</Button>
            <Button variant="text" color="error" onClick={() => removeUser(selected)} startIcon={<DeleteRoundedIcon />} disabled={busyAction !== null}>{t('delete')}</Button>
          </section>
        </> : <>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading"><Typography fontWeight={950}>{isArabic ? 'خصومات العضو' : 'Member discounts'}</Typography><Typography color="text.secondary" fontSize={12}>{isArabic ? 'خصومات مخصصة تظهر لهذا العضو.' : 'Custom offers available to this member.'}</Typography></div>
            <div className="rg-user-form-grid rg-user-discount-form">
              <UserEditorSelect label={isArabic ? 'المكان' : 'Place'} value={discount.placeId} onChange={(value) => setDiscount({ ...discount, placeId: value })}>
                {places.map((place) => <MenuItem key={place.id} value={place.id}>{place.name}</MenuItem>)}
              </UserEditorSelect>
              <UserEditorField label={isArabic ? 'تفاصيل الخصم' : 'Discount details'} value={discount.discountText} onChange={(e) => setDiscount({ ...discount, discountText: e.target.value })} />
              <Button className="rg-user-discount-save" variant="outlined" onClick={() => void saveDiscount()} disabled={busyAction !== null || !discount.placeId || !discount.discountText} startIcon={busyAction === 'discount' ? <CircularProgress size={18} /> : <AddRoundedIcon />}>{isArabic ? 'إضافة الخصم' : 'Add discount'}</Button>
            </div>
            <div className="rg-user-discount-list">
              {discounts.length ? <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>{discounts.map((item) => <Chip key={item.id} label={`${item.place.name}: ${item.discountText}`} onDelete={busyAction ? undefined : () => deleteDiscount(item.place.id)} />)}</Stack> : <Typography color="text.secondary" fontSize={13}>{isArabic ? 'لا توجد خصومات مخصصة لهذا العضو.' : 'No custom discounts for this member yet.'}</Typography>}
            </div>
          </section>
          <section className="rg-user-form-section">
            <div className="rg-user-section-heading rg-user-activity-heading">
              <Box><Typography fontWeight={950}>{t('userActivityLogs')}</Typography><Typography color="text.secondary" fontSize={12}>{isArabic ? 'آخر نشاطات الحساب.' : 'Recent account activity.'}</Typography></Box>
              <Button type="button" size="small" onClick={() => void loadDetails()} startIcon={busyAction === 'details' ? <CircularProgress size={16} /> : <HistoryRoundedIcon />} disabled={busyAction !== null}>{isArabic ? 'تحديث السجل' : 'Refresh'}</Button>
            </div>
            {logs.length ? <Box className="rg-user-log-panel">{logs.map((log) => <Box key={log.id} className="rg-user-log-entry"><Typography fontSize={12} fontWeight={800}>{log.action}</Typography><Typography color="text.secondary" fontSize={11}>{new Date(log.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB')}</Typography></Box>)}</Box> : <Typography className="rg-user-empty-state" color="text.secondary" fontSize={13}>{isArabic ? 'حدّث السجل لعرض نشاط هذا الحساب.' : 'Refresh the activity log to see this account’s recent activity.'}</Typography>}
          </section>
        </>}
        {editTab === 'profile' && <Stack direction="row" spacing={1} className="rg-user-editor-footer">
          <Button className="rg-royal-button" type="button" fullWidth variant="contained" onClick={() => void saveUser()} startIcon={busyAction === 'save' ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />} disabled={busyAction !== null}>
            {busyAction === 'save' ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : t('save')}
          </Button>
          <Button type="button" variant="outlined" onClick={closePanel}>{isArabic ? 'إغلاق' : 'Close'}</Button>
        </Stack>}
      </Stack>}
    </AdminSidePanel>

    <AdminSidePanel open={panel === 'tools'} anchor={drawerAnchor} onClose={closePanel} title={isArabic ? 'إغلاق أدوات الاستيراد' : 'Close import tools'}>
      <Stack spacing={1.5} className="rg-admin-edit-drawer" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={950}>{isArabic ? 'استيراد مستخدمين CSV' : 'Import users CSV'}</Typography>
        <Typography color="text.secondary" fontSize={13}>name, idNumber, password, membershipClass, vip</Typography>
        <Button component="a" href="/api/admin/users/import" download variant="outlined" color="secondary" startIcon={<FileDownloadRoundedIcon />}>{isArabic ? 'تنزيل قالب CSV جاهز' : 'Download ready CSV template'}</Button>
        <AdminTextField label={isArabic ? 'صلاحية الكروت' : 'Card validity'} type="date" value={csvValidUntil} onChange={(e) => setCsvValidUntil(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />} disabled={busyAction !== null}>{csvFile?.name || 'CSV'}<input hidden type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] || null)} /></Button>
        <Button type="button" variant="contained" disabled={!csvFile || busyAction !== null} onClick={() => void importCsv()} startIcon={busyAction === 'import' ? <CircularProgress size={18} color="inherit" /> : <UploadFileRoundedIcon />}>{busyAction === 'import' ? (isArabic ? 'جارٍ الاستيراد…' : 'Importing…') : (isArabic ? 'استيراد' : 'Import')}</Button>
        <Button type="button" variant="text" onClick={closePanel} startIcon={<CloseRoundedIcon />}>{isArabic ? 'إغلاق' : 'Close'}</Button>
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
    <ConfirmActionDialog
      open={Boolean(pendingDelete)}
      title={isArabic ? 'تأكيد حذف المستخدم' : 'Confirm user deletion'}
      description={pendingDelete ? (isArabic ? `سيتم حذف المستخدم ${pendingDelete.fullName} نهائيًا.` : `This permanently deletes ${pendingDelete.fullName}.`) : ''}
      confirmLabel={isArabic ? 'حذف المستخدم' : 'Delete user'}
      cancelLabel={isArabic ? 'إلغاء' : 'Cancel'}
      onClose={() => setPendingDelete(null)}
      onConfirm={confirmDeleteUser}
    />
  </>;
}
