'use client';

import * as React from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';

export default function PdfPreview() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = React.useState('جاري تحميل PDF.js...');

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
        const viewport = page.getViewport({ scale: 1.05 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        setStatus('تم عرض الكارت الخاص بالمستخدم باستخدام PDF.js');
      } catch (e) {
        setStatus('تعذر تحميل الكارت، تأكد من تسجيل الدخول ومن تشغيل API الخاص بالكارت.');
      }
    }
    renderPdf();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card sx={{ border: '1px solid rgba(20,184,166,.22)' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <PictureAsPdfRoundedIcon color="error" />
          <Typography variant="h5" fontWeight={900}>PDF.js Preview</Typography>
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>{status}</Alert>
        <Box sx={{ overflow: 'auto', bgcolor: '#111827', borderRadius: 4, p: 2, border: '1px solid rgba(15,23,42,.08)' }}>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }} />
        </Box>
        <Button href="/api/member-card/pdf" target="_blank" variant="contained" sx={{ mt: 2 }}>فتح ملف PDF</Button>
      </CardContent>
    </Card>
  );
}
