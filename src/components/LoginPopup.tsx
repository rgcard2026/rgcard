'use client';

import * as React from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useUiPreferences } from '@/components/UiPreferences';

type Popup = { title?: string; text?: string; imageUrl?: string; linkUrl?: string };

const SEEN_KEY = 'rg-login-popup-seen';

export default function LoginPopup() {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';
  const [popup, setPopup] = React.useState<Popup | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    let seen = false;
    try { seen = window.sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* ignore */ }
    if (seen) return;
    // The server decides whether THIS user is in the popup's audience.
    fetch('/api/me/popup', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (!active || !body?.popup) return;
        const data = body.popup as Popup;
        if (!data.title && !data.text && !data.imageUrl) return;
        setPopup(data);
        setOpen(true);
        try { window.sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
      })
      .catch(() => null);
    return () => { active = false; };
  }, []);

  if (!open || !popup) return null;

  const link = (popup.linkUrl || '').trim();
  const image = (popup.imageUrl || '').trim();
  const close = () => setOpen(false);

  const imageEl = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={popup.title || ''} className="rg-popup-image" />
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
        {popup.title && <h2 className="rg-popup-title">{popup.title}</h2>}
        {popup.text && <p className="rg-popup-text">{popup.text}</p>}
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
