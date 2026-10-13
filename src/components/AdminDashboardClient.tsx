'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import GppGoodRoundedIcon from '@mui/icons-material/GppGoodRounded';
import CountUp from './ui/CountUp';
import AdminDashboardExportActions from './AdminDashboardExportActions';
import { useUiPreferences } from './UiPreferences';

type Props = {
  adminName: string;
  canExport: boolean;
  stats: { users: number; activeUsers: number; places: number; branches: number; categories: number; alerts: number };
  loginSeries: { date: string; success: number; failed: number }[];
  alerts: { id: number; name: string; cardNumber: string; idNumber: string; createdAt: string }[];
};

const ease = [0.22, 1, 0.36, 1] as const;

export default function AdminDashboardClient({ adminName, canExport, stats, loginSeries, alerts }: Props) {
  const { language } = useUiPreferences();
  const ar = language === 'ar';
  const reduce = useReducedMotion();
  const locale = ar ? 'ar-EG-u-nu-latn' : 'en-GB';
  const activePct = stats.users ? Math.round((stats.activeUsers / stats.users) * 100) : 0;
  const maxTotal = Math.max(1, ...loginSeries.map((d) => d.success + d.failed));
  const totals = loginSeries.reduce((acc, d) => ({ success: acc.success + d.success, failed: acc.failed + d.failed }), { success: 0, failed: 0 });

  const kpis = [
    { label: ar ? 'إجمالي الأعضاء' : 'Total members', value: stats.users, icon: <PeopleAltRoundedIcon />, href: '/admin/users' },
    { label: ar ? 'بطاقات مفعّلة' : 'Active cards', value: stats.activeUsers, icon: <VerifiedUserRoundedIcon />, href: '/admin/users', meter: activePct, sub: ar ? `${activePct}% من الأعضاء` : `${activePct}% of members` },
    { label: ar ? 'الأماكن والعروض' : 'Places & offers', value: stats.places, icon: <StorefrontRoundedIcon />, href: '/admin/places' },
    { label: ar ? 'الفروع' : 'Branches', value: stats.branches, icon: <AccountTreeRoundedIcon />, href: '/admin/places' },
    { label: ar ? 'الفئات' : 'Categories', value: stats.categories, icon: <CategoryRoundedIcon />, href: '/admin/places' },
    { label: ar ? 'تنبيهات أمنية' : 'Security alerts', value: stats.alerts, icon: <SecurityRoundedIcon />, href: '/admin/security-alerts', tone: stats.alerts > 0 ? 'danger' : undefined }
  ];

  const quick = [
    { href: '/admin/places', label: ar ? 'إضافة مكان' : 'Add place', icon: <AddBusinessRoundedIcon /> },
    { href: '/admin/users', label: ar ? 'إضافة عضو' : 'Add member', icon: <PersonAddAltRoundedIcon /> },
    { href: '/admin/design', label: ar ? 'استوديو التصميم' : 'Design studio', icon: <PaletteRoundedIcon /> }
  ];

  const enter = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: i * 0.05, ease } });
  const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="ui-dash">
      <motion.section className="ui-panel ui-dash-hero ui-box" {...enter(0)}>
        <div className="ui-dash-hero-copy">
          <span className="ui-eyebrow">{today}</span>
          <h2 className="ui-h2">{ar ? `مرحبًا، ${adminName}` : `Welcome, ${adminName}`}</h2>
          <p className="ui-lead">{ar ? 'نظرة سريعة على الأعضاء والأماكن ونشاط الدخول خلال الأسبوع.' : 'A quick look at members, places and sign-in activity this week.'}</p>
        </div>
        <div className="ui-dash-quick">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="ui-btn ui-btn--ghost">{q.icon}{q.label}</Link>
          ))}
        </div>
      </motion.section>

      <section className="ui-dash-kpis" aria-label={ar ? 'مؤشرات' : 'Key figures'}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} {...enter(i + 1)}>
            <Link href={k.href} className={`ui-kpi ${k.tone === 'danger' ? 'ui-kpi--danger' : ''}`}>
              <span className="ui-kpi-icon">{k.icon}</span>
              <span className="ui-kpi-label">{k.label}</span>
              <strong className="ui-kpi-value"><CountUp value={k.value} /></strong>
              {k.meter !== undefined && (
                <span className="ui-kpi-meter" aria-hidden="true"><motion.span initial={{ width: 0 }} animate={{ width: `${k.meter}%` }} transition={{ duration: 1.1, delay: 0.3, ease }} /></span>
              )}
              {k.sub && <span className="ui-kpi-sub">{k.sub}</span>}
            </Link>
          </motion.div>
        ))}
      </section>

      <div className="ui-dash-grid">
        <motion.section className="ui-panel ui-panel--pad" {...enter(7)}>
          <div className="ui-dash-panel-head">
            <div className="ui-panel-title" style={{ marginBottom: 0 }}><LoginRoundedIcon /><h3 className="ui-h3">{ar ? 'نشاط تسجيل الدخول' : 'Sign-in activity'}</h3></div>
            <span className="ui-muted" style={{ fontSize: 12.5 }}>{ar ? 'آخر 7 أيام' : 'Last 7 days'}</span>
          </div>
          <div className="ui-dash-totals">
            <span><i className="ui-legend ui-legend--ok" />{ar ? 'ناجحة' : 'Successful'} <strong>{totals.success}</strong></span>
            <span><i className="ui-legend ui-legend--fail" />{ar ? 'فاشلة / محظورة' : 'Failed / blocked'} <strong>{totals.failed}</strong></span>
          </div>
          <div className="ui-chart" role="img" aria-label={ar ? 'رسم بياني لعمليات الدخول' : 'Sign-in chart'}>
            {loginSeries.map((d, i) => {
              const total = d.success + d.failed;
              const day = new Date(d.date);
              return (
                <div key={d.date} className="ui-chart-col">
                  <div className="ui-chart-bar-wrap">
                    <span className="ui-chart-tip">{ar ? `نجاح ${d.success} · فشل ${d.failed}` : `${d.success} ok · ${d.failed} failed`}</span>
                    <span className="ui-chart-total">{total}</span>
                    <motion.div
                      className="ui-chart-bar"
                      style={{ height: `${Math.max(total ? 6 : 2, (total / maxTotal) * 88)}%`, transformOrigin: 'bottom' }}
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.8, delay: 0.25 + i * 0.06, ease }}
                    >
                      {d.failed > 0 && <span className="ui-chart-fail" style={{ height: `${(d.failed / total) * 100}%` }} />}
                    </motion.div>
                  </div>
                  <span className="ui-chart-label">{day.toLocaleDateString(locale, { weekday: 'short' })}<br />{day.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section className="ui-panel ui-panel--pad" {...enter(8)}>
          <div className="ui-dash-panel-head">
            <div className="ui-panel-title" style={{ marginBottom: 0 }}><SecurityRoundedIcon /><h3 className="ui-h3">{ar ? 'التنبيهات الأمنية' : 'Security alerts'}</h3></div>
            <Link href="/admin/security-alerts" className="ui-btn ui-btn--quiet ui-btn--sm">{ar ? 'عرض الكل' : 'View all'}</Link>
          </div>
          {alerts.length ? (
            <ul className="ui-alert-list">
              {alerts.map((a) => (
                <li key={a.id}>
                  <span className="ui-dot" style={{ color: 'var(--ui-danger)' }} />
                  <div>
                    <strong>{a.name || (ar ? 'مستخدم غير معروف' : 'Unknown user')}</strong>
                    <span className="ui-muted">{ar ? 'كارت' : 'Card'} {a.cardNumber || '—'} · ID {a.idNumber || '—'}</span>
                  </div>
                  <time className="ui-muted">{new Date(a.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ui-dash-empty">
              <GppGoodRoundedIcon />
              <strong>{ar ? 'لا توجد تنبيهات حديثة' : 'No recent alerts'}</strong>
              <span className="ui-muted">{ar ? 'لم يتم رصد محاولات دخول مشبوهة.' : 'No suspicious sign-in attempts detected.'}</span>
            </div>
          )}
        </motion.section>
      </div>

      {canExport && <motion.div {...enter(9)}><AdminDashboardExportActions /></motion.div>}
    </div>
  );
}
