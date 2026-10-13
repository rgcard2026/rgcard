'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Fades and lifts its children into place once they enter the viewport. */
export default function Reveal({ children, delay = 0, y = 18, className, as = 'div' }: { children: React.ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'section' | 'header' }) {
  const reduce = useReducedMotion();
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}

/** Tracks the pointer inside an element as CSS vars (--mx/--my) for spotlight effects. */
export function usePointerSpotlight<T extends HTMLElement>() {
  return React.useCallback((event: React.PointerEvent<T>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, []);
}
