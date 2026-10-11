'use client';

import * as React from 'react';

type DesignSettings = {
  designPrimaryColor?: string;
  designSecondaryColor?: string;
  designAccentColor?: string;
  designBackgroundColor?: string;
  designSurfaceColor?: string;
  designTextColor?: string;
  designMutedTextColor?: string;
  designButtonTextColor?: string;
  designInputBackgroundColor?: string;
  designSuccessColor?: string;
  designDangerColor?: string;
  designFontFamily?: string;
  designHeadingFontFamily?: string;
  designButtonFontFamily?: string;
  designFontWeight?: number;
  designHeadingWeight?: number;
  designButtonWeight?: number;
  designFontStyle?: string;
  designHeadingStyle?: string;
  designButtonStyle?: string;
  designBodyFontSize?: number;
  designH1FontSize?: number;
  designH2FontSize?: number;
  designH3FontSize?: number;
  designCardTitleFontSize?: number;
  designButtonFontSize?: number;
  designInputFontSize?: number;
  designNavFontSize?: number;
  designCaptionFontSize?: number;
  designLineHeightPercent?: number;
  designLetterSpacing?: number;
  designButtonRadius?: number;
  designCardRadius?: number;
  designInputRadius?: number;
  designButtonShadow?: number;
  designButtonPaddingX?: number;
  designPlaceLogoScale?: number;
  designBackgroundImageUrl?: string;
  designBackgroundImageEnabled?: boolean;
  designBackgroundSize?: string;
  designBackgroundOverlay?: number;
  designCardOpacity?: number;
  designCardWidth?: number;
  designCardHeight?: number;
  designBoxOpacity?: number;
  designBoxWidth?: number;
  designBoxHeight?: number;
  designFieldOpacity?: number;
  designFieldWidth?: number;
  designFieldHeight?: number;
  designButtonOpacity?: number;
  designButtonWidth?: number;
  designButtonHeight?: number;
  designLoginBannerStartColor?: string;
  designLoginBannerEndColor?: string;
  designLoginBannerTextColor?: string;
  designLoginBannerHeight?: number;
  designLoginBannerRadius?: number;
  designLoginBannerOpacity?: number;
  designLoginBannerImageUrl?: string;
  designLoginBannerImageEnabled?: boolean;
};

function fontStack(font?: string) {
  if (!font) return undefined;
  const generic = ['serif', 'sans-serif', 'monospace'].includes(font.toLowerCase()) ? font : `"${font}"`;
  return `${generic}, "IBM Plex Sans Arabic", "Tajawal", "Cairo", "Segoe UI", Tahoma, Arial, system-ui, sans-serif`;
}

export function applyDesignSettings(settings: DesignSettings, requestedMode?: 'light' | 'dark') {
  const root = document.documentElement;
  const set = (name: string, value: string | number | undefined) => {
    if (value !== undefined && value !== null && String(value) !== '') root.style.setProperty(name, String(value));
  };
  const setPx = (name: string, value: number | undefined) => {
    if (value !== undefined && Number.isFinite(Number(value))) root.style.setProperty(name, `${Number(value)}px`);
  };

  const mode = requestedMode || (root.dataset.theme === 'dark' ? 'dark' : 'light');

  set('--rg-brand-teal', settings.designPrimaryColor);
  set('--rg-brand-blue', settings.designSecondaryColor);
  set('--rg-accent-border', settings.designAccentColor);
  set('--rg-button-text', settings.designButtonTextColor);
  set('--rg-success', settings.designSuccessColor);
  set('--rg-danger', settings.designDangerColor);

  if (mode === 'dark') {
    // Keep the chosen brand colors while using a dedicated accessible dark
    // canvas. Previously the light design values were written inline and
    // overrode every dark-mode rule, producing black text on light panels.
    set('--rg-canvas', '#0B1220');
    set('--rg-off-white', '#0B1220');
    set('--rg-cream', '#0B1220');
    set('--rg-ivory', '#111827');
    set('--rg-surface', '#111827');
    set('--rg-surface-soft', '#172033');
    set('--rg-text', '#F8FAFC');
    set('--rg-ink', '#F8FAFC');
    set('--rg-muted', '#CBD5E1');
    set('--rg-subtle', '#CBD5E1');
    set('--rg-input-bg', '#111827');
  } else {
    set('--rg-canvas', settings.designBackgroundColor);
    set('--rg-off-white', settings.designBackgroundColor);
    set('--rg-cream', settings.designBackgroundColor);
    set('--rg-ivory', settings.designBackgroundColor);
    set('--rg-surface', settings.designSurfaceColor);
    set('--rg-surface-soft', settings.designSurfaceColor);
    set('--rg-text', settings.designTextColor);
    set('--rg-ink', settings.designTextColor);
    set('--rg-muted', settings.designMutedTextColor);
    set('--rg-subtle', settings.designMutedTextColor);
    set('--rg-input-bg', settings.designInputBackgroundColor);
  }

  const bodyFont = fontStack(settings.designFontFamily);
  const headingFont = fontStack(settings.designHeadingFontFamily || settings.designFontFamily);
  const buttonFont = fontStack(settings.designButtonFontFamily || settings.designFontFamily);
  if (bodyFont) {
    root.style.setProperty('--rg-font-family', bodyFont);
    root.style.setProperty('--font-arabic', bodyFont);
  }
  if (headingFont) root.style.setProperty('--rg-heading-font-family', headingFont);
  if (buttonFont) root.style.setProperty('--rg-button-font-family', buttonFont);

  set('--rg-font-weight', settings.designFontWeight);
  set('--rg-heading-weight', settings.designHeadingWeight);
  set('--rg-button-weight', settings.designButtonWeight);
  set('--rg-font-style', settings.designFontStyle);
  set('--rg-heading-style', settings.designHeadingStyle);
  set('--rg-button-style', settings.designButtonStyle);

  setPx('--rg-body-font-size', settings.designBodyFontSize);
  setPx('--rg-h1-font-size', settings.designH1FontSize);
  setPx('--rg-h2-font-size', settings.designH2FontSize);
  setPx('--rg-h3-font-size', settings.designH3FontSize);
  setPx('--rg-card-title-font-size', settings.designCardTitleFontSize);
  setPx('--rg-button-font-size', settings.designButtonFontSize);
  setPx('--rg-input-font-size', settings.designInputFontSize);
  setPx('--rg-nav-font-size', settings.designNavFontSize);
  setPx('--rg-caption-font-size', settings.designCaptionFontSize);
  if (settings.designLineHeightPercent !== undefined) set('--rg-line-height', Number(settings.designLineHeightPercent) / 100);
  setPx('--rg-letter-spacing', settings.designLetterSpacing);

  if (settings.designButtonRadius !== undefined) setPx('--rg-button-radius', settings.designButtonRadius);
  if (settings.designCardRadius !== undefined) setPx('--rg-card-radius', settings.designCardRadius);
  if (settings.designInputRadius !== undefined) setPx('--rg-input-radius', settings.designInputRadius);
  if (settings.designButtonPaddingX !== undefined) setPx('--rg-button-padding-x', settings.designButtonPaddingX);
  if (settings.designButtonShadow !== undefined) {
    const strength = Math.max(0, Number(settings.designButtonShadow) || 0);
    const shadow = strength === 0 ? 'none' : `0 ${Math.round(strength * 0.7)}px ${Math.round(strength * 1.6)}px rgba(17,24,39,${Math.min(0.5, strength / 60).toFixed(3)})`;
    root.style.setProperty('--rg-button-shadow', shadow);
  }
  if (settings.designPlaceLogoScale !== undefined) set('--rg-place-logo-scale', (Number(settings.designPlaceLogoScale) || 100) / 100);

  set('--rg-background-size', settings.designBackgroundSize || 'cover');
  set('--rg-background-overlay', Number(settings.designBackgroundOverlay || 0) / 100);
  set('--rg-login-banner-start', settings.designLoginBannerStartColor || '#168B8A');
  set('--rg-login-banner-end', settings.designLoginBannerEndColor || '#2847D4');
  set('--rg-login-banner-text', settings.designLoginBannerTextColor || '#FFFFFF');
  setPx('--rg-login-banner-height', settings.designLoginBannerHeight ?? 304);
  setPx('--rg-login-banner-radius', settings.designLoginBannerRadius ?? 72);
  set('--rg-login-banner-opacity', Math.max(0, Math.min(100, Number(settings.designLoginBannerOpacity ?? 100))) / 100);
  root.style.setProperty(
    '--rg-login-banner-image',
    settings.designLoginBannerImageEnabled && settings.designLoginBannerImageUrl
      ? `url("${settings.designLoginBannerImageUrl}")`
      : 'none',
  );
  set('--rg-ui-card-opacity', Math.max(0, Math.min(100, Number(settings.designCardOpacity ?? 100))) / 100);
  const cardWidth = Number(settings.designCardWidth ?? 0);
  root.style.setProperty('--rg-ui-card-width', cardWidth > 0 ? `${Math.min(100, cardWidth)}%` : 'auto');
  root.dataset.rgCardWidth = cardWidth > 0 ? 'custom' : 'auto';
  const cardHeight = Number(settings.designCardHeight ?? 0);
  root.style.setProperty('--rg-ui-card-height', cardHeight > 0 ? `${Math.min(800, cardHeight)}px` : 'auto');
  root.dataset.rgCardHeight = cardHeight > 0 ? 'custom' : 'auto';
  set('--rg-ui-box-opacity', Math.max(0, Math.min(100, Number(settings.designBoxOpacity ?? 100))) / 100);
  const boxWidth = Number(settings.designBoxWidth ?? 0);
  root.style.setProperty('--rg-ui-box-width', boxWidth > 0 ? `${Math.min(100, boxWidth)}%` : 'auto');
  root.dataset.rgBoxWidth = boxWidth > 0 ? 'custom' : 'auto';
  const boxHeight = Number(settings.designBoxHeight ?? 0);
  root.style.setProperty('--rg-ui-box-height', boxHeight > 0 ? `${Math.min(800, boxHeight)}px` : 'auto');
  root.dataset.rgBoxHeight = boxHeight > 0 ? 'custom' : 'auto';
  set('--rg-ui-field-opacity', Math.max(0, Math.min(100, Number(settings.designFieldOpacity ?? 100))) / 100);
  const fieldWidth = Number(settings.designFieldWidth ?? 0);
  root.style.setProperty('--rg-ui-field-width', fieldWidth > 0 ? `${Math.min(100, fieldWidth)}%` : 'auto');
  root.dataset.rgFieldWidth = fieldWidth > 0 ? 'custom' : 'auto';
  const fieldHeight = Number(settings.designFieldHeight ?? 0);
  root.style.setProperty('--rg-ui-field-height', fieldHeight > 0 ? `${Math.min(100, fieldHeight)}px` : 'auto');
  root.dataset.rgFieldHeight = fieldHeight > 0 ? 'custom' : 'auto';
  set('--rg-ui-button-opacity', Math.max(0, Math.min(100, Number(settings.designButtonOpacity ?? 100))) / 100);
  const buttonWidth = Number(settings.designButtonWidth ?? 0);
  root.style.setProperty('--rg-ui-button-width', buttonWidth > 0 ? `${Math.min(100, buttonWidth)}%` : 'auto');
  root.dataset.rgButtonWidth = buttonWidth > 0 ? 'custom' : 'auto';
  const buttonHeight = Number(settings.designButtonHeight ?? 0);
  root.style.setProperty('--rg-ui-button-height', buttonHeight > 0 ? `${Math.min(100, buttonHeight)}px` : 'auto');
  root.dataset.rgButtonHeight = buttonHeight > 0 ? 'custom' : 'auto';
  const image = settings.designBackgroundImageEnabled && settings.designBackgroundImageUrl ? `url("${settings.designBackgroundImageUrl}")` : 'none';
  root.style.setProperty('--rg-background-image', image);
  root.dataset.rgCustomBackground = image === 'none' ? 'false' : 'true';
}

export default function DesignThemeRuntime() {
  React.useEffect(() => {
    let active = true;
    let latestSettings: DesignSettings = {};

    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (!active || !body?.data) return;
        latestSettings = body.data;
        applyDesignSettings(latestSettings);
      })
      .catch(() => null);

    const designListener = (event: Event) => {
      latestSettings = (event as CustomEvent<DesignSettings>).detail || {};
      applyDesignSettings(latestSettings);
    };
    const modeListener = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: 'light' | 'dark' }>).detail?.mode;
      applyDesignSettings(latestSettings, mode);
    };

    window.addEventListener('rg-design-updated', designListener);
    window.addEventListener('rg-mode-changed', modeListener);
    return () => {
      active = false;
      window.removeEventListener('rg-design-updated', designListener);
      window.removeEventListener('rg-mode-changed', modeListener);
    };
  }, []);
  return null;
}
