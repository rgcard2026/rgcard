'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ThreeSixtyRoundedIcon from '@mui/icons-material/ThreeSixtyRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
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
  const [backImageUrl, setBackImageUrl] = React.useState('/card-back.png?v=3');
  const [backNumber, setBackNumber] = React.useState({ x: 1292, y: 896, size: 34, opacity: 100 });
  React.useEffect(() => {
    let active = true;
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (!active || !body?.data) return;
        const d = body.data;
        if (d.designCardBackUrl) setBackImageUrl(d.designCardBackUrl);
        setBackNumber({
          x: Number(d.designCardBackNumberX ?? 1292),
          y: Number(d.designCardBackNumberY ?? 896),
          size: Number(d.designCardBackNumberSize ?? 34),
          opacity: Number(d.designCardBackNumberOpacity ?? 100),
        });
      })
      .catch(() => null);
    return () => { active = false; };
  }, []);
  const spotlight = usePointerSpotlight<HTMLAnchorElement>();
  const supportLink = useSupportLink(cardNumber);

  // Scroll-driven flip. Desktop: progress through the pinned story section.
  // Phones (no pinning): the flip completes over the first ~200px of scroll, while the card is still on screen.
  const storyRef = React.useRef<HTMLElement | null>(null);
  const [pinned, setPinned] = React.useState(true);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const update = () => setPinned(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  // Desktop progress runs exactly while the hero is pinned: from the moment the story reaches the
  // header until the spacer below it has been scrolled through.
  const spacerRef = React.useRef<HTMLDivElement | null>(null);
  const pinRange = React.useRef({ start: 0, distance: 1 });
  React.useEffect(() => {
    const measure = () => {
      const story = storyRef.current;
      const spacer = spacerRef.current;
      if (!story || !spacer) return;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-header-h')) || 68;
      pinRange.current = { start: Math.max(0, story.getBoundingClientRect().top + window.scrollY - header), distance: Math.max(1, spacer.offsetHeight) };
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (storyRef.current) observer.observe(storyRef.current);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const { scrollY } = useScroll();
  const pinnedProgress = useTransform(scrollY, (y) => Math.min(1, Math.max(0, (y - pinRange.current.start) / pinRange.current.distance)));
  const freeProgress = useTransform(scrollY, [20, 220], [0, 1], { clamp: true });
  const pinnedSpring = useSpring(pinnedProgress, { stiffness: 140, damping: 26, mass: 0.6 });
  const freeSpring = useSpring(freeProgress, { stiffness: 140, damping: 26, mass: 0.6 });
  const progress = pinned ? pinnedSpring : freeSpring;
  const flipDeg = useTransform(progress, (v) => v * 180);
  const cueOpacity = useTransform(progress, [0, 0.08], [1, 0]);
  const [showingBack, setShowingBack] = React.useState(false);
  useMotionValueEvent(progress, 'change', (v) => setShowingBack(v > 0.5));

  const tier = classLabel || (t('mc_3'));
  const firstName = (name || '').trim();

  const actions = [
    { href: '/offers', icon: <LocalOfferRoundedIcon />, title: t('viewOffers'), body: t('mc_4') },
    { href: supportLink, external: true, icon: <WhatsAppIcon />, title: t('whatsapp'), body: t('mc_5') }
  ];

  const fade = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } });

  return (
    <PublicShell watermarkText={cardNumber} page="valid">
      <main className="ui-main">
        {/* Scroll story: on desktop the hero is pinned while scrolling flips the card front → back. */}
        <section ref={storyRef} className="ui-card-story">
          <div className="ui-card-story-sticky">
            <div className="ui-container">
              <section className="ui-member-hero">
                <div className="ui-member-copy ui-box">
                  <motion.span className="ui-chip ui-chip--success" style={{ width: 'fit-content' }} {...fade(0.05)}>
                    <span className="ui-dot ui-dot--pulse" />
                    {t('activeMembership')}
                  </motion.span>
                  <motion.h1 className="ui-display" {...fade(0.12)}>
                    {t('mc_6')}<br />
                    <span className="ui-gold-text">{firstName}</span>
                  </motion.h1>
                  <motion.p className="ui-lead" {...fade(0.2)}>
                    {t('mc_7')}
                  </motion.p>
                  <motion.dl className="ui-member-meta" {...fade(0.28)}>
                    <div><dt>{t('mc_8')}</dt><dd className="ui-ltr">{cardNumber}</dd></div>
                    <div><dt>{t('mc_9')}</dt><dd>{tier}</dd></div>
                    <div><dt>{t('mc_10')}</dt><dd>{formatDate(validUntil, language)}</dd></div>
                  </motion.dl>
                  <motion.div className="ui-member-actions" {...fade(0.36)}>
                    <Link href="/offers" className="ui-btn ui-btn--primary"><LocalOfferRoundedIcon />{t('viewOffers')}</Link>
                  </motion.div>
                </div>

                <div className="ui-card-stage" aria-label={t('memberCard')}>
                  {/* The flat card shows instantly and stays as the fallback; the 3D scene fades in over it. */}
                  {(!webgl || !card3dReady) && (
                    <div className="ui-card-fallback">
                      <motion.div
                        className="ui-card-fallback-inner"
                        initial={reduce ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: webgl === true ? 0.0001 : 1, y: 0 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <motion.div className="ui-flip" style={{ rotateY: flipDeg }}>
                          <div className="ui-flip-face">
                            <MemberCard cardNumber={cardNumber} isVip={isVip} membershipClass={membershipClass} validUntil={validUntil || null} layout={layout} />
                          </div>
                          <div className="ui-flip-face ui-flip-back" aria-hidden="true">
                            <img src={backImageUrl} alt="" />
                            <span className="ui-flip-back-number">NO.{cardNumber}</span>
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  )}
                  {webgl && (
                    <motion.div style={{ position: 'absolute', inset: 0, zIndex: 1 }} initial={{ opacity: 0 }} animate={{ opacity: card3dReady ? 1 : 0 }} transition={{ duration: 0.8 }}>
                      <MemberCard3D cardNumber={cardNumber} isVip={isVip} membershipClass={membershipClass} validUntil={validUntil} layout={layout} onReady={onReady} scrollProgress={progress} backImageUrl={backImageUrl} backNumber={backNumber} />
                    </motion.div>
                  )}
                  <div className="ui-card-caption">
                    <span className="ui-card-face-label">
                      {showingBack ? (t('mc_11')) : (t('mc_12'))}
                    </span>
                    <span className="ui-card-progress" aria-hidden="true"><motion.span style={{ scaleX: progress }} /></span>
                    <span className="ui-card-hint">
                      <ThreeSixtyRoundedIcon />
                      {t('mc_13')}
                    </span>
                  </div>
                </div>
              </section>
            </div>
            <motion.div className="ui-scroll-cue" style={{ opacity: cueOpacity }} aria-hidden="true">
              <KeyboardArrowDownRoundedIcon />
            </motion.div>
          </div>
          <div ref={spacerRef} className="ui-card-story-spacer" aria-hidden="true" />
        </section>

        <div className="ui-container">

          <section className="ui-section">
            <Reveal className="ui-section-head">
              <div style={{ display: 'grid', gap: 8 }}>
                <span className="ui-eyebrow">{t('mc_14')}</span>
                <h2 className="ui-h2">{t('mc_15')}</h2>
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
