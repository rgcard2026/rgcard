'use client';

import * as React from 'react';

/**
 * Whether the WebGL scenes (3D card, gold particles) can run. Only requires WebGL:
 * the scenes are user-driven or ambient and adapt themselves to reduced-motion
 * (Windows "Animation effects" off) by moving more gently rather than switching off.
 * Returns null until measured so callers can render a neutral placeholder.
 */
export function useWebGLAllowed() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    let webgl = false;
    try {
      const canvas = document.createElement('canvas');
      webgl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      webgl = false;
    }
    setAllowed(webgl);
  }, []);
  return allowed;
}

/** True when the visitor asked the OS for less motion. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
