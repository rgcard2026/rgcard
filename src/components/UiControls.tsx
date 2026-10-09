'use client';

import * as React from 'react';
import { Stack, Tooltip } from '@mui/material';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import { useUiPreferences } from './UiPreferences';

export default function UiControls({ compact = false }: { compact?: boolean }) {
  const { language, mode, toggleMode, toggleLanguage, t } = useUiPreferences();
  const languageCode = language === 'ar' ? 'EN' : 'ع';
  const languageLabel = language === 'ar' ? 'English' : 'العربية';
  const themeLabel = mode === 'light' ? t('darkMode') : t('lightMode');

  return (
    <Stack direction="row" spacing={compact ? .55 : .8} alignItems="center" className={`rg-ui-controls ${compact ? 'rg-ui-controls-compact' : ''}`}>
      <Tooltip title={languageLabel}>
        <button type="button" className="rg-language-toggle" onClick={toggleLanguage} aria-label={languageLabel}>
          <span className="rg-language-toggle-icon"><TranslateRoundedIcon fontSize="small" /></span>
          <span className="rg-language-toggle-code">{languageCode}</span>
        </button>
      </Tooltip>
      <Tooltip title={themeLabel}>
        <button type="button" className={`rg-theme-toggle ${mode === 'dark' ? 'is-dark' : 'is-light'}`} onClick={toggleMode} aria-label={themeLabel}>
          <LightModeRoundedIcon className="rg-theme-toggle-sun" fontSize="small" />
          <DarkModeRoundedIcon className="rg-theme-toggle-moon" fontSize="small" />
          <span className="rg-theme-toggle-thumb" aria-hidden="true" />
        </button>
      </Tooltip>
    </Stack>
  );
}
