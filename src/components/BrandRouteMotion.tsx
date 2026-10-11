'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Thin gold progress bar shown while an in-app link is navigating.
 * Starts on click of a same-origin link and completes when the pathname changes.
 */
export default function BrandRouteMotion() {
  const pathname = usePathname();
  const [active, setActive] = React.useState(false);
  const failsafe = React.useRef<number | null>(null);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
        setActive(true);
        if (failsafe.current) window.clearTimeout(failsafe.current);
        failsafe.current = window.setTimeout(() => setActive(false), 8000);
      } catch { /* Ignore malformed hrefs. */ }
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (failsafe.current) window.clearTimeout(failsafe.current);
    };
  }, []);

  React.useEffect(() => { setActive(false); }, [pathname]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="route-progress"
          className="ui-progress"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85, transition: { duration: 2.4, ease: [0.1, 0.7, 0.2, 1] } }}
          exit={{ scaleX: 1, opacity: 0, transition: { scaleX: { duration: 0.2 }, opacity: { duration: 0.3, delay: 0.15 } } }}
        />
      )}
    </AnimatePresence>
  );
}
