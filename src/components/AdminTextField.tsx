
'use client';

import * as React from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Tooltip, Typography } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';

export type AdminTextFieldProps = TextFieldProps & {
  /** Disable the large editor for compact/sensitive inputs. */
  noExpand?: boolean;
};

/**
 * Standard admin text input with an optional large editor. It keeps the normal
 * field behaviour but lets the admin review and edit long values without the
 * page layout becoming difficult to read on mobile.
 */
export default function AdminTextField({ noExpand = false, ...props }: AdminTextFieldProps) {
  const [open, setOpen] = React.useState(false);
  const value = props.value === null || props.value === undefined ? '' : String(props.value);
  const [draft, setDraft] = React.useState(value);
  const type = String((props as any).type || 'text').toLowerCase();
  const isSelect = Boolean((props as any).select);
  const canExpand = !noExpand && !isSelect && !['password', 'date', 'number', 'file', 'hidden', 'checkbox', 'radio'].includes(type);
  const inputProps = ((props as any).InputProps || {}) as Record<string, any>;
  const inputNativeProps = ((props as any).inputProps || {}) as Record<string, any>;
  const fieldLabel = typeof props.label === 'string' ? props.label : 'تحرير النص';

  function openEditor() {
    setDraft(value);
    setOpen(true);
  }

  function applyDraft() {
    const handler = (props as any).onChange as ((event: any) => void) | undefined;
    if (handler) {
      const target = { value: draft, name: (props as any).name || '' };
      handler({ target, currentTarget: target });
    }
    setOpen(false);
  }

  return (
    <>
      <TextField
        {...props}
        InputProps={{
          ...inputProps,
          endAdornment: canExpand ? (
            <>
              {inputProps.endAdornment}
              <InputAdornment position="end">
                <Tooltip title="فتح محرر أكبر للنص">
                  <span>
                    <IconButton
                      size="small"
                      aria-label={`تكبير حقل ${fieldLabel}`}
                      onClick={openEditor}
                      disabled={Boolean((props as any).disabled)}
                      edge="end"
                    >
                      <OpenInFullRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            </>
          ) : inputProps.endAdornment
        }}
      />

      {canExpand && (
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" dir="rtl">
          <DialogTitle sx={{ fontWeight: 950 }}>{fieldLabel}</DialogTitle>
          <DialogContent dividers>
            <Typography color="text.secondary" fontSize={13} sx={{ mb: 1.5 }}>
              اكتب أو راجع النص كاملًا ثم اضغط تطبيق النص.
            </Typography>
            <TextField
              fullWidth
              autoFocus
              multiline
              minRows={10}
              maxRows={18}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              inputProps={inputNativeProps}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={() => setOpen(false)} color="inherit">إلغاء</Button>
            <Button onClick={applyDraft} variant="contained">تطبيق النص</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
