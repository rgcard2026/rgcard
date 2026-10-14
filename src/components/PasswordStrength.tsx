'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useUiPreferences } from '@/components/UiPreferences';

type Props = { value: string; confirmValue?: string; language: 'ar' | 'en'; required?: boolean };

export function getPasswordScore(value: string) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

export function isStrongEnough(value: string) { return getPasswordScore(value) >= 3; }

export default function PasswordStrength({ value, confirmValue, required = false }: Props) {
  const { t } = useUiPreferences();
  const score = getPasswordScore(value);
  const hasPassword = Boolean(value);
  const matching = confirmValue === undefined || (!hasPassword && !required) || value === confirmValue;
  const labels = [t('pw_weak'), t('pw_fair'), t('pw_good'), t('pw_strong')];
  const requirements = t('pw_requirements');
  const label = !hasPassword ? requirements : labels[Math.max(0, score - 1)];
  const matchLabel = matching ? t('pw_match') : t('pw_nomatch');

  return (
    <Stack spacing={.45} className="rg-password-strength" aria-live="polite">
      <Box className={`rg-password-strength-meter rg-password-strength-${score}`}><span style={{ width: `${Math.max(8, score * 25)}%` }} /></Box>
      <Typography fontSize={12} color={score >= 3 || !hasPassword ? 'text.secondary' : 'warning.main'}>{label}</Typography>
      {hasPassword && score < 3 && <Typography fontSize={11} color="warning.main">{requirements}</Typography>}
      {confirmValue !== undefined && <Typography fontSize={12} color={matching ? 'success.main' : 'error.main'}>{matchLabel}</Typography>}
    </Stack>
  );
}
