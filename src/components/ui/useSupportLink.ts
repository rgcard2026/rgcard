'use client';

import * as React from 'react';
import { DEFAULT_WHATSAPP_MESSAGE, DEFAULT_WHATSAPP_NUMBER, whatsappUrl } from '@/lib/whatsapp';

/** WhatsApp support link using the number/message configured by the admin. */
export function useSupportLink(identifier?: string) {
  const [config, setConfig] = React.useState({ number: DEFAULT_WHATSAPP_NUMBER, message: DEFAULT_WHATSAPP_MESSAGE });
  React.useEffect(() => {
    let alive = true;
    fetch('/api/settings').then((r) => r.json()).then((body) => {
      if (!alive) return;
      setConfig((current) => ({
        number: body?.data?.whatsappNumber || current.number,
        message: body?.data?.whatsappMessage || current.message
      }));
    }).catch(() => null);
    return () => { alive = false; };
  }, []);
  return whatsappUrl(identifier, config.number, config.message);
}
