'use client';

import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { useUiPreferences } from '../UiPreferences';

/** Compact language + theme toggles used across the member experience. */
export default function PreferenceButtons() {
  const { language, mode, toggleMode, toggleLanguage, t } = useUiPreferences();
  const languageLabel = language === 'ar' ? 'English' : 'العربية';
  const themeLabel = mode === 'light' ? t('darkMode') : t('lightMode');

  return (
    <>
      <button type="button" className="ui-icon-btn" onClick={toggleLanguage} aria-label={languageLabel} title={languageLabel}>
        <span className="ui-lang-code">{language === 'ar' ? 'EN' : 'ع'}</span>
      </button>
      <button type="button" className="ui-icon-btn" onClick={toggleMode} aria-label={themeLabel} title={themeLabel}>
        {mode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
      </button>
    </>
  );
}
