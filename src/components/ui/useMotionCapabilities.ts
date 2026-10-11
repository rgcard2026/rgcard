'use client';

import * as React from 'react';

/**
 * Decides whether heavy WebGL effects should run: requires WebGL and respects
 * the visitor's reduced-motion preference. Returns null until measured so
 * callers can render a neutral placeholder during hydration.
 */
export function useWebGLAllowed() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let webgl = false;
    try {
      const canvas = document.createElement('canvas');
      webgl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      webgl = false;
    }
    setAllowed(webgl && !reduced);
  }, []);
  return allowed;
}
