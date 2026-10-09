'use client';

import * as React from 'react';
import { Box, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

type LogRow = {
  id: number;
  action: string;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  createdAt: string;
  user?: { fullName: string; idNumber: string; cardNumber: string } | null;
  admin?: { name: string; username: string } | null;
};

export default function AdminLogsClient() {
  const [logs, setLogs] = React.useState<LogRow[]>([]);

  React.useEffect(() => {
    fetch('/api/admin/logs?take=200')
      .then((r) => r.json())
      .then((body) => setLogs(body.data || []));
  }, []);

  return (
    <Card sx={{ border: '1px solid rgba(15,23,42,.08)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={900}>User Activity Logs</Typography>
            <Typography color="text.secondary">آخر 200 حدث للمستخدمين والإدارة.</Typography>
          </Box>
          <Chip label={`${logs.length} log`} color="primary" />
        </Stack>
        <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الوقت</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>المستخدم</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Path</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.createdAt).toLocaleString('ar-EG')}</TableCell>
                  <TableCell><Chip size="small" label={log.action} /></TableCell>
                  <TableCell>{log.user ? `${log.user.fullName} / ${log.user.cardNumber}` : log.admin ? `Admin: ${log.admin.username}` : '-'}</TableCell>
                  <TableCell sx={{ direction: 'ltr' }}>{log.ip || '-'}</TableCell>
                  <TableCell sx={{ direction: 'ltr' }}>{log.path || '-'}</TableCell>
                </TableRow>
              ))}
              {!logs.length && <TableRow><TableCell colSpan={5}>لا توجد Logs حتى الآن.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
        <Stack spacing={1.2} sx={{ display: { xs: 'flex', md: 'none' } }}>
          {logs.map((log) => (
            <Box key={log.id} sx={{ p: 1.4, borderRadius: 3, bgcolor: 'rgba(15,23,42,.035)', border: '1px solid rgba(15,23,42,.08)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Chip size="small" label={log.action} />
                <Typography fontSize={11} color="text.secondary">{new Date(log.createdAt).toLocaleString('ar-EG')}</Typography>
              </Stack>
              <Typography sx={{ mt: 1, fontSize: 13, wordBreak: 'break-word' }}>{log.user ? `${log.user.fullName} / ${log.user.cardNumber}` : log.admin ? `Admin: ${log.admin.username}` : '-'}</Typography>
              <Typography sx={{ mt: .5, fontSize: 12, direction: 'ltr', textAlign: 'right', wordBreak: 'break-all' }}>{log.ip || '-'} {log.path ? `• ${log.path}` : ''}</Typography>
            </Box>
          ))}
          {!logs.length && <Typography color="text.secondary">لا توجد Logs حتى الآن.</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}
