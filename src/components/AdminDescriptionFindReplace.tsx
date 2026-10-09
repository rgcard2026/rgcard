'use client';

import * as React from 'react';
import AdminTextField from '@/components/AdminTextField';
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import FindReplaceRoundedIcon from '@mui/icons-material/FindReplaceRounded';
import PreviewRoundedIcon from '@mui/icons-material/PreviewRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useUiPreferences } from './UiPreferences';

type Scope = 'places' | 'offers' | 'both';
type FieldScope = 'descriptions' | 'notes' | 'both';
type Preview = {
  places: { records: number; occurrences: number; descriptions: number; notes: number };
  offers: { records: number; occurrences: number; descriptions: number; notes: number };
  totalRecords: number;
  totalOccurrences: number;
  fieldOccurrences: { descriptions: number; notes: number };
};

async function readJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { ok: false, message: text || 'Unable to read server response' }; }
}

export default function AdminDescriptionFindReplace({ onCompleted }: { onCompleted: () => Promise<void> | void }) {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';
  const [open, setOpen] = React.useState(false);
  const [find, setFind] = React.useState('');
  const [replacement, setReplacement] = React.useState('');
  const [scope, setScope] = React.useState<Scope>('both');
  const [fields, setFields] = React.useState<FieldScope>('both');
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [confirmation, setConfirmation] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  function resetPreview() {
    setPreview(null);
    setConfirmation('');
    setMessage('');
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setMessage('');
  }

  async function request(dryRun: boolean) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/places/find-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          find,
          replace: replacement,
          scope,
          fields,
          caseSensitive,
          dryRun,
          confirmation: dryRun ? undefined : 'REPLACE_CONTENT'
        })
      });
      const body = await readJson(response);
      if (!response.ok) {
        setMessage(body.message || (isArabic ? 'تعذر تنفيذ العملية' : 'Unable to complete the operation'));
        return null;
      }
      return body.data as Preview;
    } finally {
      setBusy(false);
    }
  }

  async function previewChanges() {
    if (!find.trim()) {
      setMessage(isArabic ? 'أدخل النص المطلوب البحث عنه أولاً.' : 'Enter text to find first.');
      return;
    }
    const next = await request(true);
    if (next) setPreview(next);
  }

  async function applyChanges() {
    if (!preview || !preview.totalRecords) return;
    if (confirmation.trim().toUpperCase() !== 'REPLACE') {
      setMessage(isArabic ? 'اكتب REPLACE لتأكيد الاستبدال.' : 'Type REPLACE to confirm the replacement.');
      return;
    }
    const result = await request(false);
    if (!result) return;
    await onCompleted();
    setMessage(isArabic ? `تم تحديث ${result.totalRecords} سجل بنجاح.` : `${result.totalRecords} record(s) updated successfully.`);
    setPreview(result);
    setConfirmation('');
  }

  const scopeLabel = (value: Scope) => {
    if (isArabic) return value === 'places' ? 'الأماكن' : value === 'offers' ? 'العروض' : 'الأماكن والعروض';
    return value === 'places' ? 'Places' : value === 'offers' ? 'Offers' : 'Places & offers';
  };

  const fieldLabel = (value: FieldScope) => {
    if (isArabic) return value === 'descriptions' ? 'الوصف فقط' : value === 'notes' ? 'الملاحظات فقط' : 'الوصف والملاحظات';
    return value === 'descriptions' ? 'Descriptions only' : value === 'notes' ? 'Notes only' : 'Descriptions & notes';
  };

  return <>
    <Button variant="outlined" startIcon={<FindReplaceRoundedIcon />} onClick={() => setOpen(true)}>
      {isArabic ? 'بحث واستبدال المحتوى' : 'Find & replace content'}
    </Button>
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" className="rg-find-replace-dialog">
      <DialogTitle>
        <Stack spacing={.5}>
          <Typography component="span" variant="h6" fontWeight={950}>{isArabic ? 'بحث واستبدال في الوصف والملاحظات' : 'Find & replace in descriptions and notes'}</Typography>
          <Typography component="span" color="text.secondary" fontSize={13}>{isArabic ? 'اختر البيانات والحقول المطلوبة، ثم استخدم المعاينة واكتب REPLACE قبل التطبيق.' : 'Choose the records and fields, preview the result, then type REPLACE before applying.'}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {message && <Alert severity={/تعذر|Unable|أدخل|Type REPLACE/.test(message) ? 'error' : 'success'}>{message}</Alert>}
          <AdminTextField
            autoFocus
            label={isArabic ? 'النص المطلوب البحث عنه' : 'Find text'}
            value={find}
            onChange={(event) => { setFind(event.target.value); resetPreview(); }}
            helperText={isArabic ? 'يمكن البحث داخل الوصف أو الملاحظات أو الاثنين.' : 'Search descriptions, notes, or both.'}
          />
          <AdminTextField
            label={isArabic ? 'النص البديل' : 'Replace with'}
            value={replacement}
            multiline
            minRows={2}
            onChange={(event) => { setReplacement(event.target.value); resetPreview(); }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <FormControl fullWidth>
              <InputLabel>{isArabic ? 'نوع البيانات' : 'Records'}</InputLabel>
              <Select label={isArabic ? 'نوع البيانات' : 'Records'} value={scope} onChange={(event) => { setScope(event.target.value as Scope); resetPreview(); }}>
                <MenuItem value="both">{scopeLabel('both')}</MenuItem>
                <MenuItem value="places">{scopeLabel('places')}</MenuItem>
                <MenuItem value="offers">{scopeLabel('offers')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{isArabic ? 'الحقول' : 'Fields'}</InputLabel>
              <Select label={isArabic ? 'الحقول' : 'Fields'} value={fields} onChange={(event) => { setFields(event.target.value as FieldScope); resetPreview(); }}>
                <MenuItem value="both">{fieldLabel('both')}</MenuItem>
                <MenuItem value="descriptions">{fieldLabel('descriptions')}</MenuItem>
                <MenuItem value="notes">{fieldLabel('notes')}</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <FormControlLabel control={<Checkbox checked={caseSensitive} onChange={(event) => { setCaseSensitive(event.target.checked); resetPreview(); }} />} label={isArabic ? 'مطابقة حالة الأحرف' : 'Match letter case'} />
          {preview && <>
            <Divider />
            <Stack spacing={1}>
              <Typography fontWeight={950}>{isArabic ? 'نتيجة المعاينة' : 'Preview result'}</Typography>
              <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>
                <Chip label={`${isArabic ? 'الأماكن' : 'Places'}: ${preview.places.records}`} />
                <Chip label={`${isArabic ? 'العروض' : 'Offers'}: ${preview.offers.records}`} />
                <Chip label={`${isArabic ? 'الوصف' : 'Descriptions'}: ${preview.fieldOccurrences.descriptions}`} />
                <Chip label={`${isArabic ? 'الملاحظات' : 'Notes'}: ${preview.fieldOccurrences.notes}`} />
                <Chip color="secondary" label={`${isArabic ? 'إجمالي الاستبدالات' : 'Total replacements'}: ${preview.totalOccurrences}`} />
              </Stack>
              {preview.totalRecords > 0 ? <>
                <Typography color="text.secondary" fontSize={13}>{isArabic ? `سيتم تحديث ${preview.totalRecords} سجل. اكتب REPLACE للتأكيد.` : `${preview.totalRecords} record(s) will be updated. Type REPLACE to confirm.`}</Typography>
                <AdminTextField label={isArabic ? 'تأكيد الاستبدال' : 'Replacement confirmation'} placeholder="REPLACE" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </> : <Alert severity="info">{isArabic ? 'لا توجد بيانات مطابقة للنص المكتوب.' : 'No matching content was found.'}</Alert>}
            </Stack>
          </>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={close} disabled={busy}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<PreviewRoundedIcon />} onClick={previewChanges} disabled={busy || !find.trim()}>{isArabic ? 'معاينة' : 'Preview'}</Button>
        <Button variant="contained" color="warning" startIcon={<SaveRoundedIcon />} onClick={applyChanges} disabled={busy || !preview?.totalRecords || confirmation.trim().toUpperCase() !== 'REPLACE'}>{isArabic ? 'تطبيق الاستبدال' : 'Apply replacement'}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
