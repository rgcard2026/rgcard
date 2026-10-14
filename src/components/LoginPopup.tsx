'use client';

import * as React from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useUiPreferences } from '@/components/UiPreferences';

type PopupSettings = {
  designPopupEnabled?: boolean;
  designPopupTitle?: string;
  designPopupText?: string;
  designPopupImageUrl?: string;
  designPopupLinkUrl?: string;
};

const SEEN_KEY = 'rg-login-popup-seen';

export default function LoginPopup() {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';
  const [popup, setPopup] = React.useState<PopupSettings | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (!active || !body?.data) return;
        const data = body.data as PopupSettings;
        const hasContent = Boolean(data.designPopupTitle || data.designPopupText || data.designPopupImageUrl);
        if (!data.designPopupEnabled || !hasContent) return;
        let seen = false;
        try { seen = window.sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* ignore */ }
        if (seen) return;
        setPopup(data);
        setOpen(true);
        try { window.sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
      })
      .catch(() => null);
    return () => { active = false; };
  }, []);

  if (!open || !popup) return null;

  const link = (popup.designPopupLinkUrl || '').trim();
  const image = (popup.designPopupImageUrl || '').trim();
  const close = () => setOpen(false);

  const imageEl = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={popup.designPopupTitle || ''} className="rg-popup-image" />
  ) : null;

  return (
    <div className="rg-popup-overlay" role="dialog" aria-modal="true" onClick={close}>
      <div className="rg-popup-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="rg-popup-close" onClick={close} aria-label={isArabic ? 'إغلاق' : 'Close'}>
          <CloseRoundedIcon />
        </button>
        {imageEl && (link
          ? <a href={link} target="_blank" rel="noopener noreferrer" className="rg-popup-image-link">{imageEl}</a>
          : imageEl)}
        {popup.designPopupTitle && <h2 className="rg-popup-title">{popup.designPopupTitle}</h2>}
        {popup.designPopupText && <p className="rg-popup-text">{popup.designPopupText}</p>}
        <div className="rg-popup-actions">
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--primary">
              <OpenInNewRoundedIcon />{isArabic ? 'عرض التفاصيل' : 'Learn more'}
            </a>
          )}
          <button type="button" className="ui-btn ui-btn--ghost" onClick={close}>{isArabic ? 'إغلاق' : 'Close'}</button>
        </div>
      </div>
    </div>
  );
}
