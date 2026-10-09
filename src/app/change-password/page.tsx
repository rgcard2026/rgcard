'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Container, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) return setMsg(body.message || 'تعذر تغيير كلمة المرور');
    router.push(body.redirectTo || '/valid');
  }

  const endAdornment = (
    <InputAdornment position="end">
      <IconButton onClick={() => setShow(!show)} edge="end" aria-label="show password">
        {show ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <Box className="rg-login-page">
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card className="rg-auth-card">
          <CardContent sx={{ p: 4 }}>
            <Stack component="form" spacing={2.2} onSubmit={submit}>
              <Box textAlign="center">
                <Box className="rg-crown-mark" sx={{ mx: 'auto', mb: 2 }}>♛</Box>
                <Typography variant="h4" fontWeight={950}>تغيير كلمة المرور</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>مطلوب تغيير كلمة المرور أول مرة قبل استخدام الكارت.</Typography>
              </Box>
              {msg && <Alert severity="error">{msg}</Alert>}
              <TextField label="كلمة المرور الحالية" type={show ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required InputProps={{ endAdornment }} />
              <TextField label="كلمة المرور الجديدة" type={show ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required helperText="لا تستخدم رقم الكارت أو الرقم التعريفي أو الاسم داخل كلمة المرور" InputProps={{ endAdornment }} />
              <Button type="submit" className="rg-royal-button" variant="contained" disabled={loading} startIcon={<LockResetRoundedIcon />}>{loading ? 'جاري الحفظ...' : 'حفظ ومتابعة'}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
