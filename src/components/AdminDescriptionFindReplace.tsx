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
  const { language, t } = useUiPreferences();
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
        setMessage(body.message || (t('adm_258')));
        return null;
      }
      return body.data as Preview;
    } finally {
      setBusy(false);
    }
  }

  async function previewChanges() {
    if (!find.trim()) {
      setMessage(t('adm_259'));
      return;
    }
    const next = await request(true);
    if (next) setPreview(next);
  }

  async function applyChanges() {
    if (!preview || !preview.totalRecords) return;
    if (confirmation.trim().toUpperCase() !== 'REPLACE') {
      setMessage(t('adm_260'));
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
      {t('adm_261')}
    </Button>
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" className="rg-find-replace-dialog">
      <DialogTitle>
        <Stack spacing={.5}>
          <Typography component="span" variant="h6" fontWeight={950}>{t('adm_262')}</Typography>
          <Typography component="span" color="text.secondary" fontSize={13}>{t('adm_263')}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {message && <Alert severity={/تعذر|Unable|أدخل|Type REPLACE/.test(message) ? 'error' : 'success'}>{message}</Alert>}
          <AdminTextField
            autoFocus
            label={t('adm_264')}
            value={find}
            onChange={(event) => { setFind(event.target.value); resetPreview(); }}
            helperText={t('adm_265')}
          />
          <AdminTextField
            label={t('adm_266')}
            value={replacement}
            multiline
            minRows={2}
            onChange={(event) => { setReplacement(event.target.value); resetPreview(); }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <FormControl fullWidth>
              <InputLabel>{t('adm_267')}</InputLabel>
              <Select label={t('adm_267')} value={scope} onChange={(event) => { setScope(event.target.value as Scope); resetPreview(); }}>
                <MenuItem value="both">{scopeLabel('both')}</MenuItem>
                <MenuItem value="places">{scopeLabel('places')}</MenuItem>
                <MenuItem value="offers">{scopeLabel('offers')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('adm_268')}</InputLabel>
              <Select label={t('adm_268')} value={fields} onChange={(event) => { setFields(event.target.value as FieldScope); resetPreview(); }}>
                <MenuItem value="both">{fieldLabel('both')}</MenuItem>
                <MenuItem value="descriptions">{fieldLabel('descriptions')}</MenuItem>
                <MenuItem value="notes">{fieldLabel('notes')}</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <FormControlLabel control={<Checkbox checked={caseSensitive} onChange={(event) => { setCaseSensitive(event.target.checked); resetPreview(); }} />} label={t('adm_269')} />
          {preview && <>
            <Divider />
            <Stack spacing={1}>
              <Typography fontWeight={950}>{t('adm_270')}</Typography>
              <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>
                <Chip label={`${t('adm_271')}: ${preview.places.records}`} />
                <Chip label={`${t('adm_272')}: ${preview.offers.records}`} />
                <Chip label={`${t('adm_273')}: ${preview.fieldOccurrences.descriptions}`} />
                <Chip label={`${t('adm_274')}: ${preview.fieldOccurrences.notes}`} />
                <Chip color="secondary" label={`${t('adm_275')}: ${preview.totalOccurrences}`} />
              </Stack>
              {preview.totalRecords > 0 ? <>
                <Typography color="text.secondary" fontSize={13}>{isArabic ? `سيتم تحديث ${preview.totalRecords} سجل. اكتب REPLACE للتأكيد.` : `${preview.totalRecords} record(s) will be updated. Type REPLACE to confirm.`}</Typography>
                <AdminTextField label={t('adm_276')} placeholder="REPLACE" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </> : <Alert severity="info">{t('adm_277')}</Alert>}
            </Stack>
          </>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={close} disabled={busy}>{t('adm_80')}</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<PreviewRoundedIcon />} onClick={previewChanges} disabled={busy || !find.trim()}>{t('adm_278')}</Button>
        <Button variant="contained" color="warning" startIcon={<SaveRoundedIcon />} onClick={applyChanges} disabled={busy || !preview?.totalRecords || confirmation.trim().toUpperCase() !== 'REPLACE'}>{t('adm_279')}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
