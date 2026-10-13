'use client';

import * as React from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

/** Animates a number from 0 to `value` the first time it scrolls into view. */
export default function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!inView || reduce) { el.textContent = String(value); return; }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { el.textContent = String(Math.round(v)); }
    });
    return () => controls.stop();
  }, [duration, inView, reduce, value]);

  return <span ref={ref}>0</span>;
}
