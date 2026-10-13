'use client';

import * as React from 'react';
import type { DesignSettings as StoredDesignSettings } from '@/lib/design-defaults';

type DesignSettings = Partial<StoredDesignSettings>;

// Fonts the studio offers that are not installed on most systems and must be fetched.
const WEB_FONTS = new Set([
  'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', 'Noto Kufi Arabic', 'Noto Sans Arabic', 'Almarai', 'Changa',
  'El Messiri', 'Amiri', 'Readex Pro', 'Alexandria', 'Reem Kufi', 'Outfit', 'Inter', 'Poppins', 'Montserrat', 'Roboto'
]);

function fontStack(font?: string) {
  if (!font) return undefined;
  const generic = ['serif', 'sans-serif', 'monospace'].includes(font.toLowerCase()) ? font : `"${font}"`;
  return `${generic}, "IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, system-ui, sans-serif`;
}

/** Injects one Google Fonts stylesheet for the families the studio selected. */
function loadFonts(families: Array<string | undefined>) {
  const wanted = Array.from(new Set(families.filter((f): f is string => Boolean(f && WEB_FONTS.has(f)))));
  if (!wanted.length) return;
  const href = `https://fonts.googleapis.com/css2?${wanted.map((f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800`).join('&')}&display=swap`;
  let link = document.getElementById('rg-design-fonts') as HTMLLinkElement | null;
  if (link?.href === href) return;
  if (!link) {
    link = document.createElement('link');
    link.id = 'rg-design-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
}

const clamp01 = (value: unknown, fallback = 100) => Math.max(0, Math.min(100, Number(value ?? fallback))) / 100;

/**
 * Applies Design Studio settings as CSS custom properties on <html>.
 * The member and admin UIs read only --ui-* tokens (see src/styles/ui.css);
 * this function is the single bridge from stored settings to those tokens.
 */
export function applyDesignSettings(settings: DesignSettings, requestedMode?: 'light' | 'dark') {
  const root = document.documentElement;
  const set = (name: string, value: string | number | undefined | null) => {
    if (value !== undefined && value !== null && String(value) !== '') root.style.setProperty(name, String(value));
  };
  const px = (value: number | undefined) => (value !== undefined && Number.isFinite(Number(value)) ? `${Number(value)}px` : undefined);
  const mode = requestedMode || (root.dataset.theme === 'dark' ? 'dark' : 'light');

  // Brand colors apply in both modes. Hover/soft/line variants derive from them.
  const primary = settings.designPrimaryColor;
  const secondary = settings.designSecondaryColor || primary;
  const accent = settings.designAccentColor || primary;
  if (primary) {
    // Light mode darkens the accent for readable text on pale surfaces.
    set('--ui-gold', mode === 'light' ? `color-mix(in srgb, ${primary} 70%, #000)` : primary);
    set('--ui-gold-hi', `color-mix(in srgb, ${primary} 55%, #fff)`);
    set('--ui-gold-lo', `color-mix(in srgb, ${secondary} 80%, #000)`);
    set('--ui-gold-grad', `linear-gradient(135deg, color-mix(in srgb, ${primary} 55%, #fff) 0%, ${primary} 42%, ${secondary} 100%)`);
    set('--ui-gold-soft', `color-mix(in srgb, ${primary} ${mode === 'light' ? 10 : 12}%, transparent)`);
  }
  if (accent) set('--ui-gold-line', `color-mix(in srgb, ${accent} ${mode === 'light' ? 38 : 32}%, transparent)`);
  set('--ui-gold-ink', settings.designButtonTextColor);
  set('--ui-success', settings.designSuccessColor);
  set('--ui-danger', settings.designDangerColor);

  // Canvas colors are a light palette; dark mode keeps the dark tokens from ui.css.
  const canvasTokens = ['--ui-bg', '--ui-bg-raised', '--ui-surface', '--ui-surface-2', '--ui-text', '--ui-text-2', '--ui-muted'];
  if (mode === 'dark') {
    canvasTokens.forEach((token) => root.style.removeProperty(token));
  } else {
    set('--ui-bg', settings.designBackgroundColor);
    set('--ui-surface', settings.designSurfaceColor);
    if (settings.designSurfaceColor) set('--ui-surface-2', `color-mix(in srgb, ${settings.designSurfaceColor} 94%, ${settings.designTextColor || '#000'})`);
    set('--ui-bg-raised', settings.designInputBackgroundColor);
    set('--ui-text', settings.designTextColor);
    if (settings.designTextColor) set('--ui-text-2', `color-mix(in srgb, ${settings.designTextColor} 80%, ${settings.designBackgroundColor || '#fff'})`);
    set('--ui-muted', settings.designMutedTextColor);
  }

  // Typography.
  loadFonts([settings.designFontFamily, settings.designHeadingFontFamily, settings.designButtonFontFamily]);
  set('--ui-font-body', fontStack(settings.designFontFamily));
  set('--ui-font-display', fontStack(settings.designHeadingFontFamily || settings.designFontFamily));
  set('--ui-font-button', fontStack(settings.designButtonFontFamily || settings.designFontFamily));
  set('--ui-weight-body', settings.designFontWeight);
  set('--ui-weight-heading', settings.designHeadingWeight);
  set('--ui-weight-button', settings.designButtonWeight);
  set('--ui-style-body', settings.designFontStyle);
  set('--ui-style-heading', settings.designHeadingStyle);
  set('--ui-style-button', settings.designButtonStyle);
  set('--ui-fs-body', px(settings.designBodyFontSize));
  set('--ui-fs-h1', px(settings.designH1FontSize));
  set('--ui-fs-h2', px(settings.designH2FontSize));
  set('--ui-fs-h3', px(settings.designH3FontSize));
  set('--ui-fs-card-title', px(settings.designCardTitleFontSize));
  set('--ui-fs-button', px(settings.designButtonFontSize));
  set('--ui-fs-input', px(settings.designInputFontSize));
  set('--ui-fs-nav', px(settings.designNavFontSize));
  set('--ui-fs-caption', px(settings.designCaptionFontSize));
  if (settings.designLineHeightPercent !== undefined) set('--ui-line-height', Number(settings.designLineHeightPercent) / 100);
  set('--ui-letter-spacing', px(settings.designLetterSpacing));

  // Shape and depth.
  set('--ui-radius-btn', px(settings.designButtonRadius));
  set('--ui-radius-lg', px(settings.designCardRadius));
  set('--ui-radius-input', px(settings.designInputRadius));
  set('--ui-btn-px', px(settings.designButtonPaddingX));
  if (settings.designButtonShadow !== undefined) {
    const s = Math.max(0, Number(settings.designButtonShadow) || 0);
    set('--ui-btn-shadow', s === 0 ? 'none' : `0 ${Math.round(s * 0.7)}px ${Math.round(s * 2)}px color-mix(in srgb, var(--ui-gold) ${Math.min(45, s * 1.6)}%, transparent)`);
  }
  if (settings.designPlaceLogoScale !== undefined) set('--ui-logo-scale', (Number(settings.designPlaceLogoScale) || 100) / 100);

  // Component opacity / size overrides (0 = automatic).
  const sizeKnob = (name: 'card' | 'box' | 'field' | 'button', opacity?: number, width?: number, height?: number, maxHeight = 800) => {
    set(`--ui-${name}-opacity`, clamp01(opacity));
    const w = Number(width ?? 0);
    const h = Number(height ?? 0);
    root.style.setProperty(`--ui-${name}-width`, w > 0 ? `${Math.min(100, w)}%` : 'auto');
    root.style.setProperty(`--ui-${name}-height`, h > 0 ? `${Math.min(maxHeight, h)}px` : 'auto');
    root.dataset[`ui${name[0].toUpperCase()}${name.slice(1)}Size`] = w > 0 || h > 0 ? 'custom' : 'auto';
  };
  sizeKnob('card', settings.designCardOpacity, settings.designCardWidth, settings.designCardHeight);
  sizeKnob('box', settings.designBoxOpacity, settings.designBoxWidth, settings.designBoxHeight);
  sizeKnob('field', settings.designFieldOpacity, settings.designFieldWidth, settings.designFieldHeight, 100);
  sizeKnob('button', settings.designButtonOpacity, settings.designButtonWidth, settings.designButtonHeight, 100);

  // Page background image.
  const image = settings.designBackgroundImageEnabled && settings.designBackgroundImageUrl ? `url("${settings.designBackgroundImageUrl}")` : 'none';
  root.style.setProperty('--ui-bg-image', image);
  set('--ui-bg-size', settings.designBackgroundSize || 'cover');
  set('--ui-bg-veil', Number(settings.designBackgroundOverlay ?? 12) / 100);
  root.dataset.uiBgImage = image === 'none' ? 'off' : 'on';

  // Login banner (brand panel on the sign-in screens).
  set('--ui-banner-start', settings.designLoginBannerStartColor);
  set('--ui-banner-end', settings.designLoginBannerEndColor);
  set('--ui-banner-text', settings.designLoginBannerTextColor);
  set('--ui-banner-height', px(settings.designLoginBannerHeight));
  set('--ui-banner-radius', px(settings.designLoginBannerRadius));
  set('--ui-banner-opacity', clamp01(settings.designLoginBannerOpacity));
  root.style.setProperty(
    '--ui-banner-image',
    settings.designLoginBannerImageEnabled && settings.designLoginBannerImageUrl ? `url("${settings.designLoginBannerImageUrl}")` : 'none'
  );
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
