'use client';

import * as React from 'react';
import Link from 'next/link';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useUiPreferences } from './UiPreferences';

export default function PdfPreview() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';

  React.useEffect(() => {
    let cancelled = false;
    async function renderPdf() {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.entry');
        // @ts-ignore
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const pdf = await pdfjs.getDocument('/api/member-card/pdf').promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    }
    renderPdf();
    return () => { cancelled = true; };
  }, []);

  return (
    <section>
      <Link href="/valid" className="ui-back">
        <ArrowForwardRoundedIcon className="ui-flip-ltr" />
        {isArabic ? 'بطاقتي' : 'My card'}
      </Link>
      <div className="ui-section-head">
        <div style={{ display: 'grid', gap: 8 }}>
          <span className="ui-eyebrow">PDF</span>
          <h1 className="ui-h2">{isArabic ? 'نسخة البطاقة للطباعة' : 'Printable card copy'}</h1>
        </div>
        <a href="/api/member-card/pdf" target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--primary"><DownloadRoundedIcon />{isArabic ? 'فتح ملف PDF' : 'Open PDF file'}</a>
      </div>
      {state === 'error' && <div className="ui-alert ui-alert--error" style={{ marginTop: 16 }}><ErrorOutlineRoundedIcon />{isArabic ? 'تعذر تحميل البطاقة. تأكد من تسجيل الدخول وحاول مرة أخرى.' : 'Could not load your card. Make sure you are signed in and try again.'}</div>}
      <div className="ui-pdf-frame">
        {state === 'loading' && <div className="ui-skeleton" style={{ aspectRatio: '1.6', maxWidth: 760, margin: '0 auto' }} />}
        <canvas ref={canvasRef} style={{ display: state === 'ready' ? 'block' : 'none' }} />
      </div>
    </section>
  );
}
