'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ThreeSixtyRoundedIcon from '@mui/icons-material/ThreeSixtyRounded';
import PublicShell from './PublicShell';
import MemberCard from './MemberCard';
import Reveal, { usePointerSpotlight } from './ui/Reveal';
import { useWebGLAllowed } from './ui/useMotionCapabilities';
import { useUiPreferences } from './UiPreferences';
import type { CardRenderLayout } from '@/lib/card-layout';
import { useSupportLink } from './ui/useSupportLink';

const MemberCard3D = dynamic(() => import('./ui/MemberCard3D'), { ssr: false });

type Props = {
  name: string;
  cardNumber: string;
  isVip: boolean;
  membershipClass?: string | null;
  validUntil?: string | null;
  classLabel?: string | null;
  layout: CardRenderLayout;
};

function formatDate(value: string | null | undefined, language: 'ar' | 'en') {
  if (!value) return language === 'ar' ? 'غير محدد' : 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB',{ year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MemberExperienceClient({ name, cardNumber, isVip, membershipClass, validUntil, classLabel, layout }: Props) {
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';
  const webgl = useWebGLAllowed();
  const reduce = useReducedMotion();
  const [card3dReady, setCard3dReady] = React.useState(false);
  const onReady = React.useCallback(() => setCard3dReady(true), []);
  const spotlight = usePointerSpotlight<HTMLAnchorElement>();
  const supportLink = useSupportLink(cardNumber);

  const tier = classLabel || (isArabic ? 'عضوية أساسية' : 'Standard');
  const firstName = (name || '').trim();

  const actions = [
    { href: '/offers', icon: <LocalOfferRoundedIcon />, title: t('viewOffers'), body: isArabic ? 'كل الأماكن والخصومات المتاحة لعضويتك، مع البحث بالمحافظة والفئة.' : 'Every place and discount available to you, filterable by governorate and category.' },
    { href: '/member-card-pdf', icon: <PictureAsPdfRoundedIcon />, title: t('downloadPdf'), body: isArabic ? 'نسخة PDF من بطاقتك جاهزة للعرض عند الحاجة.' : 'A PDF copy of your card, ready whenever you need it.' },
    { href: supportLink, external: true, icon: <WhatsAppIcon />, title: t('whatsapp'), body: isArabic ? 'فريق الدعم متاح لأي استفسار بخصوص حسابك أو الخصومات.' : 'Our team is on hand for any question about your account or discounts.' }
  ];

  const fade = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } });

  return (
    <PublicShell watermarkText={cardNumber} page="valid">
      <main className="ui-main">
        <div className="ui-container">
          <section className="ui-member-hero">
            <div className="ui-member-copy ui-box">
              <motion.span className="ui-chip ui-chip--success" style={{ width: 'fit-content' }} {...fade(0.05)}>
                <span className="ui-dot ui-dot--pulse" />
                {t('activeMembership')}
              </motion.span>
              <motion.h1 className="ui-display" {...fade(0.12)}>
                {isArabic ? 'أهلًا،' : 'Welcome,'}<br />
                <span className="ui-gold-text">{firstName}</span>
              </motion.h1>
              <motion.p className="ui-lead" {...fade(0.2)}>
                {isArabic ? 'بطاقتك الرقمية جاهزة. اعرضها في أي مكان من شبكة RG-Card لتحصل على خصمك فورًا.' : 'Your digital card is ready. Show it anywhere in the RG-Card network to redeem your discount instantly.'}
              </motion.p>
              <motion.dl className="ui-member-meta" {...fade(0.28)}>
                <div><dt>{isArabic ? 'رقم البطاقة' : 'Card number'}</dt><dd className="ui-ltr">{cardNumber}</dd></div>
                <div><dt>{isArabic ? 'الفئة' : 'Tier'}</dt><dd>{tier}</dd></div>
                <div><dt>{isArabic ? 'صالحة حتى' : 'Valid until'}</dt><dd>{formatDate(validUntil, language)}</dd></div>
              </motion.dl>
              <motion.div className="ui-member-actions" {...fade(0.36)}>
                <Link href="/offers" className="ui-btn ui-btn--primary"><LocalOfferRoundedIcon />{t('viewOffers')}</Link>
                <Link href="/member-card-pdf" className="ui-btn ui-btn--ghost"><PictureAsPdfRoundedIcon />{t('downloadPdf')}</Link>
              </motion.div>
            </div>

            <div className="ui-card-stage" aria-label={t('memberCard')}>
              {/* The flat card shows instantly and stays as the fallback; the 3D scene fades in over it. */}
              {(!webgl || !card3dReady) && (
                <div className="ui-card-fallback">
                  <motion.div
                    className="ui-card-fallback-inner"
                    initial={reduce ? false : { opacity: 0, rotateX: 18, y: 20 }}
                    animate={{ opacity: webgl === true ? 0.0001 : 1, rotateX: 0, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <MemberCard cardNumber={cardNumber} isVip={isVip} membershipClass={membershipClass} validUntil={validUntil || null} layout={layout} />
                  </motion.div>
                </div>
              )}
              {webgl && (
                <motion.div style={{ position: 'absolute', inset: 0, zIndex: 1 }} initial={{ opacity: 0 }} animate={{ opacity: card3dReady ? 1 : 0 }} transition={{ duration: 0.8 }}>
                  <MemberCard3D cardNumber={cardNumber} isVip={isVip} membershipClass={membershipClass} validUntil={validUntil} layout={layout} onReady={onReady} />
                </motion.div>
              )}
              {webgl && card3dReady && (
                <span className="ui-card-hint"><ThreeSixtyRoundedIcon />{isArabic ? 'اسحب لتدوير البطاقة، أو اضغط لقلبها' : 'Drag to rotate, tap to flip'}</span>
              )}
            </div>
          </section>

          <section className="ui-section">
            <Reveal className="ui-section-head">
              <div style={{ display: 'grid', gap: 8 }}>
                <span className="ui-eyebrow">{isArabic ? 'اختصارات' : 'Shortcuts'}</span>
                <h2 className="ui-h2">{isArabic ? 'كل ما تحتاجه من عضويتك' : 'Everything your membership offers'}</h2>
              </div>
            </Reveal>
            <div className="ui-action-grid">
              {actions.map((action, index) => (
                <Reveal key={action.title} delay={index * 0.08}>
                  <a
                    href={action.href}
                    className="ui-action"
                    onPointerMove={spotlight}
                    {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    <span className="ui-action-icon">{action.icon}</span>
                    <ArrowBackRoundedIcon className="ui-action-arrow ui-flip-ltr" />
                    <h3 className="ui-h3">{action.title}</h3>
                    <p>{action.body}</p>
                  </a>
                </Reveal>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
