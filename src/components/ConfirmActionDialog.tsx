'use client';

import * as React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmActionDialog({ open, title, description, confirmLabel, cancelLabel, onClose, onConfirm }: Props) {
  const [busy, setBusy] = React.useState(false);

  function blurFocusedElement() {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }

  function close() {
    if (busy) return;
    blurFocusedElement();
    onClose();
  }

  async function confirm() {
    setBusy(true);
    try {
      blurFocusedElement();
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="xs" className="rg-confirm-dialog" disableRestoreFocus keepMounted={false}>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberRoundedIcon color="warning" />
          <Typography component="span" fontWeight={950}>{title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent><Typography color="text.secondary">{description}</Typography></DialogContent>
      <DialogActions sx={{ p: 2, pt: 1.2 }}>
        <Button onClick={close} disabled={busy}>{cancelLabel}</Button>
        <Button color="error" variant="contained" onClick={confirm} disabled={busy}>{busy ? '…' : confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
