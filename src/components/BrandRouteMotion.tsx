'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * A small, global route transition that keeps navigation feedback consistent
 * without changing browser history or intercepting external links.
 */
export default function BrandRouteMotion() {
  const pathname = usePathname();
  const timer = React.useRef<number | null>(null);

  const flash = React.useCallback(() => {
    const root = document.documentElement;
    root.classList.add('rg-route-is-changing');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => root.classList.remove('rg-route-is-changing'), 260);
  }, []);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
        flash();
      } catch { /* Ignore malformed hrefs. */ }
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [flash]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('rg-route-is-changing');
  }, [pathname]);

  return null;
}
