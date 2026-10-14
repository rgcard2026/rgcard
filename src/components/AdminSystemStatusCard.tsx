'use client';

import * as React from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';

type CheckStatus = 'ok' | 'warn' | 'error';
type StatusCheck = { key: string; label: string; status: CheckStatus; detail: string };
type StatusReport = { overall: CheckStatus; message: string; checkedAt: string; checks: StatusCheck[] };

async function readBody(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { message: text || 'تعذر قراءة رد الخادم' }; }
}

export default function AdminSystemStatusCard() {
  const [backupBusy, setBackupBusy] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [statusReport, setStatusReport] = React.useState<StatusReport | null>(null);
  const [notice, setNotice] = React.useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  async function downloadBackup() {
    if (backupBusy) return;
    setBackupBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/backup', { cache: 'no-store' });
      if (!response.ok) {
        const body = await readBody(response);
        setNotice({ severity: 'error', text: body.message || 'تعذر تنزيل النسخة الاحتياطية.' });
        return;
      }
      const archive = await response.blob();
      const objectUrl = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'rg-card-backup.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setNotice({ severity: 'success', text: 'تم إنشاء وتنزيل النسخة الاحتياطية التي تتضمن قاعدة البيانات والملفات المرفوعة وشعارات وصور الكارت.' });
    } catch {
      setNotice({ severity: 'error', text: 'تعذر الاتصال بالخادم لإنشاء النسخة الاحتياطية.' });
    } finally {
      setBackupBusy(false);
    }
  }

  async function checkStatus() {
    if (statusBusy) return;
    setStatusBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/status', { cache: 'no-store' });
      const body = await readBody(response);
      if (!response.ok && !body?.checks) {
        setNotice({ severity: 'error', text: body.message || 'تعذر فحص حالة النظام.' });
        return;
      }
      setStatusReport({
        overall: body.overall,
        message: body.message,
        checkedAt: body.checkedAt,
        checks: Array.isArray(body.checks) ? body.checks : [],
      });
    } catch {
      setNotice({ severity: 'error', text: 'تعذر الاتصال بالخادم لفحص حالة النظام.' });
    } finally {
      setStatusBusy(false);
    }
  }

  const statusSeverity: Record<CheckStatus, 'success' | 'warning' | 'error'> = { ok: 'success', warn: 'warning', error: 'error' };

  function renderCheckIcon(status: CheckStatus) {
    if (status === 'ok') return <CheckCircleRoundedIcon color="success" fontSize="small" />;
    if (status === 'warn') return <WarningAmberRoundedIcon color="warning" fontSize="small" />;
    return <ErrorRoundedIcon color="error" fontSize="small" />;
  }

  return (
    <Card className="rg-panel-card">
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={950}>حالة النظام والنسخة الاحتياطية</Typography>
            <Typography color="text.secondary" fontSize={13}>
              افحص الحالة الحالية للتأكد من عدم وجود أي تلف في قاعدة البيانات أو الملفات، ونزّل نسخة احتياطية كاملة تتضمن قاعدة البيانات والملفات المرفوعة والشعارات وصور الكارت.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
            <Button type="button" variant="outlined" startIcon={statusBusy ? <CircularProgress size={18} /> : <HealthAndSafetyRoundedIcon />} disabled={statusBusy} onClick={checkStatus}>
              {statusBusy ? 'جارٍ فحص الحالة…' : 'فحص الحالة الحالية'}
            </Button>
            <Button type="button" variant="outlined" startIcon={backupBusy ? <CircularProgress size={18} /> : <FileDownloadRoundedIcon />} disabled={backupBusy} onClick={downloadBackup}>
              {backupBusy ? 'جارٍ تجهيز النسخة الاحتياطية…' : 'تنزيل النسخة الاحتياطية'}
            </Button>
          </Stack>
        </Stack>

        {statusReport && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={statusSeverity[statusReport.overall]} sx={{ fontWeight: 800 }}>
              {statusReport.message}
              <Typography component="span" display="block" fontSize={12} fontWeight={500} sx={{ mt: 0.5, opacity: 0.85 }}>
                آخر فحص: {new Date(statusReport.checkedAt).toLocaleString('ar-EG')}
              </Typography>
            </Alert>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {statusReport.checks.map((check) => (
                <Stack key={check.key} direction="row" spacing={1.2} alignItems="flex-start" sx={{ p: 1.2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ mt: '2px' }}>{renderCheckIcon(check.status)}</Box>
                  <Box>
                    <Typography fontWeight={900} fontSize={14}>{check.label}</Typography>
                    <Typography color="text.secondary" fontSize={13}>{check.detail}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        <Snackbar open={!!notice} autoHideDuration={6500} onClose={(_e, reason) => { if (reason !== 'clickaway') setNotice(null); }} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={notice?.severity || 'success'} variant="filled" onClose={() => setNotice(null)} sx={{ width: '100%', fontWeight: 900 }}>{notice?.text || ''}</Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
