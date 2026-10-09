'use client';

import * as React from 'react';
import { Alert } from '@mui/material';

async function logActivity(action: string, page: string, details?: Record<string, unknown>) {
  try {
    await fetch('/api/logs/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, page, details })
    });
  } catch {
    // Best-effort client log; do not interrupt the user interface.
  }
}

export default function ClientProtection({ watermarkText, page }: { watermarkText?: string; page: string }) {
  const [notice, setNotice] = React.useState('');
  const watermark = React.useMemo(() => String(watermarkText || '').trim(), [watermarkText]);

  React.useEffect(() => {
    logActivity('PAGE_VIEW', page);

    const show = (message: string) => {
      setNotice(message);
      window.setTimeout(() => setNotice(''), 2500);
    };

    const block = (event: Event, action: string, message: string) => {
      event.preventDefault();
      show(message);
      logActivity(action, page);
    };

    const onContextMenu = (event: MouseEvent) => block(event, 'CONTEXT_MENU_BLOCKED', 'تم تعطيل القائمة المختصرة لهذه الصفحة.');
    const onCopy = (event: ClipboardEvent) => block(event, 'COPY_BLOCKED', 'تم تعطيل النسخ لهذه الصفحة.');
    const onCut = (event: ClipboardEvent) => block(event, 'COPY_BLOCKED', 'تم تعطيل القص لهذه الصفحة.');
    const onDrag = (event: DragEvent) => event.preventDefault();
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['c', 'x', 's', 'p', 'u'].includes(key)) {
        block(event, key === 'p' ? 'PRINT_BLOCKED' : 'COPY_BLOCKED', 'هذا الإجراء غير متاح داخل صفحة الكارت.');
      }
      if (key === 'printscreen') {
        event.preventDefault();
        navigator.clipboard?.writeText('').catch(() => undefined);
        show('تم رصد محاولة Screenshot.');
        logActivity('PRINTSCREEN_BLOCKED', page);
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('dragstart', onDrag);
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('rg-protected-page');

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('dragstart', onDrag);
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('rg-protected-page');
    };
  }, [page]);

  return (
    <>
      {watermark && (
        <div aria-hidden="true" className="rg-watermark-grid-v43" data-watermark-mode="dense-repeat-foreground">
          {Array.from({ length: 20 }, (_, index) => (
            <span key={index} className="rg-watermark-grid-v43-text">{watermark}</span>
          ))}
        </div>
      )}
      {notice && (
        <Alert severity="warning" sx={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, boxShadow: 3 }}>
          {notice}
        </Alert>
      )}
    </>
  );
}
