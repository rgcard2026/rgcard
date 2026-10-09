'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { encryptForLogin } from '@/lib/clientEncryption';
import { Alert, Box, Button, Card, CardContent, Container, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';

const enableLoginEncryption = process.env.NEXT_PUBLIC_ENABLE_LOGIN_ENCRYPTION === 'true';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let body: Record<string, string> = { username, password };
    if (enableLoginEncryption) {
      try {
        body = { payload: await encryptForLogin({ username, password }) };
      } catch {
        setLoading(false);
        return setError('تعذر تشفير بيانات الدخول. استخدم HTTPS أو عطّل التشفير في بيئة التطوير.');
      }
    }

    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const responseBody = await res.json();
    setLoading(false);
    if (!res.ok) return setError(responseBody.message || 'بيانات الدخول غير صحيحة');
    router.push(responseBody.redirectTo || '/admin/dashboard');
  }

  return (
    <Box className="rg-login-page rg-admin-login-page">
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card className="rg-auth-card rg-admin-auth-card">
          <CardContent sx={{ p: 4 }}>
            <Stack component="form" onSubmit={submit} spacing={2.5}>
              <Stack alignItems="center" spacing={1}>
                <Box className="rg-crown-mark">♛</Box>
                <Typography variant="h4" className="rg-section-title">Admin Login</Typography>
                <Typography color="text.secondary">لوحة تحكم RG-Card</Typography>
              </Stack>
              {!enableLoginEncryption && <Alert severity="info" sx={{ borderRadius: 3 }}>Development mode: login encryption is disabled temporarily.</Alert>}
              {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
              <TextField className="rg-premium-input" label="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} required InputProps={{ startAdornment: <AdminPanelSettingsRoundedIcon sx={{ ml: 1, color: 'text.secondary' }} /> }} />
              <TextField className="rg-premium-input" label="كلمة المرور" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required InputProps={{ startAdornment: <LockRoundedIcon sx={{ ml: 1, color: 'text.secondary' }} />, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}</IconButton></InputAdornment> }} />
              <Button className="rg-royal-button" type="submit" variant="contained" size="large" disabled={loading}>{loading ? 'جاري الدخول...' : 'دخول'}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
