'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import PreferenceButtons from './PreferenceButtons';
import { useWebGLAllowed } from './useMotionCapabilities';
import { useUiPreferences } from '../UiPreferences';

const GoldDust = dynamic(() => import('./GoldDust'), { ssr: false });

type Props = {
  title: string;
  subtitle?: string;
  brandTitle?: string;
  brandSubtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/** Split-screen auth page: cinematic brand panel + focused form. */
export default function AuthLayout({ title, subtitle, brandTitle = 'RG-Card', brandSubtitle, footer, children }: Props) {
  const { language, dir } = useUiPreferences();
  const isArabic = language === 'ar';
  const webgl = useWebGLAllowed();
  const reduce = useReducedMotion();
  const enter = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } });

  return (
    <div className="ui-root" dir={dir}>
      <div className="ui-ambient" aria-hidden="true" />
      <div className="ui-auth">
        <aside className="ui-auth-visual" aria-hidden="true">
          {webgl && <GoldDust />}
          <div className="ui-auth-topline">
            <span className="ui-brand">
              <span className="ui-brand-name">{brandTitle}</span>
            </span>
            <span className="ui-eyebrow">{isArabic ? 'عضوية ملكية' : 'Royal membership'}</span>
          </div>
          <motion.div
            className="ui-auth-emblem"
            initial={reduce ? false : { opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div className="ui-auth-tagline" {...enter(0.4)}>
            <h2 className="ui-display">{isArabic ? 'امتيازات تليق بك.' : 'Privileges, refined.'}</h2>
            <p>{brandSubtitle || (isArabic ? 'خصومات حصرية لدى شبكة مختارة من الأماكن والعلامات التجارية.' : 'Exclusive discounts across a curated network of places and brands.')}</p>
          </motion.div>
        </aside>

        <section className="ui-auth-form-side">
          <div className="ui-auth-form-top"><PreferenceButtons /></div>
          <div className="ui-auth-form-wrap">
            <motion.div className="ui-auth-mobile-brand" {...enter(0)}>
              <span className="ui-auth-emblem" style={{ backgroundImage: 'var(--ui-emblem)' }} />
            </motion.div>
            <motion.header className="ui-auth-head" {...enter(0.08)}>
              <h1 className="ui-h2">{title}</h1>
              {subtitle && <p className="ui-lead" style={{ fontSize: 15 }}>{subtitle}</p>}
            </motion.header>
            <motion.div {...enter(0.16)}>{children}</motion.div>
            {footer && <motion.div {...enter(0.24)}>{footer}</motion.div>}
          </div>
        </section>
      </div>
    </div>
  );
}
