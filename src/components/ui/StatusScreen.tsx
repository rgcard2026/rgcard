'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUiPreferences } from '../UiPreferences';

type Props = { code: string; title: string; body: string; action?: { label: string; href?: string; onClick?: () => void } };

/** Full-screen branded message used by 404 and error boundaries. */
export default function StatusScreen({ code, title, body, action }: Props) {
  const { dir } = useUiPreferences();
  return (
    <div className="ui-root" dir={dir}>
      <div className="ui-ambient" aria-hidden="true" />
      <main className="ui-status">
        <motion.span className="ui-status-mark" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <span className="ui-eyebrow">{code}</span>
          <h1 className="ui-h2">{title}</h1>
          <p className="ui-lead" style={{ textAlign: 'center' }}>{body}</p>
          {action && (action.href
            ? <Link href={action.href} className="ui-btn ui-btn--primary" style={{ marginTop: 10 }}>{action.label}</Link>
            : <button type="button" onClick={action.onClick} className="ui-btn ui-btn--primary" style={{ marginTop: 10 }}>{action.label}</button>)}
        </motion.div>
      </main>
    </div>
  );
}
