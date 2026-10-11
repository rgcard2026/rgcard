'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import PublicShell from '@/components/PublicShell';
import CountUp from '@/components/ui/CountUp';
import { useUiPreferences } from '@/components/UiPreferences';

type AnyItem = Record<string, any>;
type PageItem = number | 'ellipsis';

function normalizeList(payload: any): AnyItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.places)) return payload.places;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.governorates)) return payload.governorates;
  return [];
}

async function fetchJson(path: string) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function textOf(value: any): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizeArabicSearch(value: any): string {
  return textOf(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function pickName(item: AnyItem): string {
  return textOf(item.nameAr || item.name || item.title || item.nameEn || item.branchName || 'مكان RG-Card');
}

function pickLogo(item: AnyItem): string {
  return textOf(item.logoUrl || item.logo || item.imageUrl || item.image || item.logoPath || '');
}

function pickCategoryLabel(item: AnyItem): string {
  return textOf(item.category?.nameAr || item.category?.name || item.categoryName || item.categoryLabel || item.category || '');
}

function pickCategoryValue(item: AnyItem): string {
  return textOf(item.categoryId || item.category?.id || pickCategoryLabel(item));
}

function pickBranches(item: AnyItem): AnyItem[] {
  return Array.isArray(item.branches) ? item.branches : Array.isArray(item.Branches) ? item.Branches : [];
}

function pickGovernorates(item: AnyItem): string[] {
  const values = new Set<string>();
  const directAssignments = Array.isArray(item.governorates) ? item.governorates : [];
  if (item.governoratesConfigured) {
    for (const assignment of directAssignments) {
      const governorate = textOf(assignment.governorate?.name || assignment.name || assignment.governorateName);
      if (governorate) values.add(governorate);
    }
    return Array.from(values);
  }

  const direct = textOf(item.governorate?.name || item.governorate || item.governorateName || item.city);
  if (direct) values.add(direct);
  for (const branch of pickBranches(item)) {
    const governorate = textOf(branch.governorate?.name || branch.governorate || branch.governorateName || branch.city);
    if (governorate) values.add(governorate);
  }
  return Array.from(values);
}

function allSearchablePlaceText(place: AnyItem): string {
  const assignedGovernorates = pickGovernorates(place);
  const branches = pickBranches(place).flatMap((branch) => [
    branch.name,
    branch.branchName,
    branch.address,
    branch.phone,
    branch.mapUrl,
    branch.governorate?.name,
    branch.governorate,
    branch.governorateName,
    branch.city
  ]);
  const offers = Array.isArray(place.offers) ? place.offers.flatMap((offer: AnyItem) => [
    offer.title,
    offer.description,
    offer.discountText,
    offer.bannerText,
    offer.exclusiveText
  ]) : [];

  return normalizeArabicSearch([
    place.name,
    place.nameAr,
    place.nameEn,
    place.description,
    place.descriptionAr,
    place.descriptionEn,
    place.discount,
    place.baseDiscount,
    place.exclusiveText,
    place.category?.name,
    place.categoryName,
    ...assignedGovernorates,
    ...branches,
    ...offers
  ].filter(Boolean).join(' '));
}

function initials(name: string): string {
  const compact = name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!compact) return 'RG';
  return compact.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

/** Short discount label for the tile badge, e.g. "25%" out of a long sentence. */
function discountBadge(place: AnyItem): string {
  const raw = textOf(place.discount);
  if (!raw) return '';
  const percent = raw.match(/\d{1,3}\s?%/);
  if (percent) return percent[0].replace(/\s/g, '');
  return raw.length > 18 ? `${raw.slice(0, 16)}…` : raw;
}

function LogoImage({ item, className }: { item: AnyItem; className?: string }) {
  const [failed, setFailed] = useState(false);
  const logo = pickLogo(item);
  const name = pickName(item);
  return logo && !failed
    ? <img className={className} src={logo} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <span className="ui-tile-initials" aria-hidden="true">{initials(name)}</span>;
}

/** Catalogue tile with a subtle pointer-driven 3D tilt and spotlight. */
function PlaceTile({ place, label, index, reduce }: { place: AnyItem; label: string; index: number; reduce: boolean | null }) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const badge = discountBadge(place);

  function onMove(event: React.PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || reduce || event.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width;
    const y = (event.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateY(-3px)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = '';
  }

  // Entrance animation lives on the wrapper; the tilt transform lives on the link.
  return (
    <motion.div
      className="ui-tile-wrap"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: (index % 12) * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <a
        ref={ref}
        className="ui-tile"
        data-rg-logo-transition="true"
        href={`/places/${place.id}`}
        title={pickName(place)}
        aria-label={`${label}: ${pickName(place)}`}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <span className="ui-tile-plate">
          <LogoImage item={place} />
          {badge && <span className={`ui-tile-badge ${place.hasCustomDiscount ? 'ui-tile-badge--special' : ''}`}>{badge}</span>}
        </span>
        <span className="ui-tile-body">
          <strong className="ui-tile-name">{pickName(place)}</strong>
          {pickCategoryLabel(place) && <span className="ui-tile-cat">{pickCategoryLabel(place)}</span>}
        </span>
        <span className="ui-tile-shine" aria-hidden="true" />
      </a>
    </motion.div>
  );
}

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 1) return [];
  const current = currentPage + 1;
  const pages: number[] = [];
  const add = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && !pages.includes(pageNumber)) pages.push(pageNumber);
  };
  add(1);
  for (let pageNumber = current - 1; pageNumber <= current + 1; pageNumber += 1) add(pageNumber);
  add(totalPages);
  pages.sort((a, b) => a - b);
  return pages.flatMap((pageNumber, index) => {
    const previous = pages[index - 1] || 0;
    return index > 0 && pageNumber - previous > 1 ? ['ellipsis' as const, pageNumber] : [pageNumber];
  });
}

export default function OffersPage() {
  const { language, t } = useUiPreferences();
  const isArabic = language === 'ar';
  const reduce = useReducedMotion();
  const [me, setMe] = useState<AnyItem | null>(null);
  const [places, setPlaces] = useState<AnyItem[]>([]);
  const [categories, setCategories] = useState<AnyItem[]>([]);
  const [governorates, setGovernorates] = useState<AnyItem[]>([]);
  // Standalone admin-managed carousel feed. It does not depend on Place or Offer.
  const [newArrivals, setNewArrivals] = useState<AnyItem[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  // Keep the catalogue compact: 12 places per page fills 2/3/4/6-column grids evenly.
  const pageSize = 12;
  const arrivalViewportRef = useRef<HTMLDivElement | null>(null);
  const gridTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [meData, placesData, categoriesData, governoratesData, arrivalsData] = await Promise.all([
        fetchJson('/api/me'),
        fetchJson('/api/places'),
        fetchJson('/api/categories'),
        fetchJson('/api/governorates'),
        fetchJson('/api/new-arrivals')
      ]);
      if (!mounted) return;
      setMe(meData?.user || meData?.data || meData || null);
      setPlaces(normalizeList(placesData).filter((item) => item?.isActive !== false));
      setCategories(normalizeList(categoriesData));
      setGovernorates(normalizeList(governoratesData));
      setNewArrivals(
        normalizeList(arrivalsData)
          .filter((item) => item?.isActive !== false && textOf(item?.logoUrl) && textOf(item?.targetUrl))
          .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0) || Number(a?.id || 0) - Number(b?.id || 0))
      );
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const categoryItem of categories) {
      const label = textOf(categoryItem.nameAr || categoryItem.name || categoryItem.title || categoryItem.label);
      const value = textOf(categoryItem.id || label);
      if (label && value) map.set(value, label);
    }
    for (const place of places) {
      const label = pickCategoryLabel(place);
      const value = pickCategoryValue(place);
      if (label && value && !map.has(value)) map.set(value, label);
    }
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [categories, places]);

  const governorateOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of governorates) {
      const label = textOf(item.nameAr || item.name || item.title || item.label);
      if (label) values.add(label);
    }
    places.forEach((place) => pickGovernorates(place).forEach((name) => values.add(name)));
    return Array.from(values);
  }, [governorates, places]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = normalizeArabicSearch(query);
    return places.filter((place) => {
      const matchesSearch = !normalizedQuery || allSearchablePlaceText(place).includes(normalizedQuery);
      const categoryLabel = pickCategoryLabel(place);
      const categoryValue = pickCategoryValue(place);
      const matchesCategory = !category || category === categoryValue || category === categoryLabel;
      const matchesGovernorate = !governorate || pickGovernorates(place).includes(governorate);
      return matchesSearch && matchesCategory && matchesGovernorate;
    });
  }, [places, query, category, governorate]);

  const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visiblePlaces = filteredPlaces.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageItems = buildPageItems(safePage - 1, totalPages);
  // The banner is controlled only by /admin/new-arrivals.
  const bannerArrivals = useMemo(
    () => newArrivals.filter((item) => textOf(item?.logoUrl) && textOf(item?.targetUrl)),
    [newArrivals]
  );
  const bannerVisualItems = useMemo(() => {
    if (!bannerArrivals.length) return [] as AnyItem[];
    // A sufficiently long, repeated sequence guarantees that the viewport is always
    // filled even when the admin has only one logo in the standalone banner.
    const minimumCardsPerGroup = 14;
    const repeats = Math.max(1, Math.ceil(minimumCardsPerGroup / bannerArrivals.length));
    return Array.from({ length: repeats }, () => bannerArrivals).flat();
  }, [bannerArrivals]);

  // Endless ticker: a floating-point offset wraps at the exact width of the first of two
  // identical sequences, so there is no visible reset. Pauses while hovered.
  useEffect(() => {
    const viewport = arrivalViewportRef.current;
    if (!viewport || !bannerVisualItems.length || reduce) return;

    let frameId = 0;
    let previousTime = 0;
    let logicalOffset = 0;
    let paused = false;
    const speedPixelsPerSecond = 26;
    const primaryGroup = viewport.querySelector<HTMLElement>('[data-arrival-sequence="primary"]');
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    viewport.addEventListener('pointerenter', pause);
    viewport.addEventListener('pointerleave', resume);

    const tick = (now: number) => {
      if (!previousTime) previousTime = now;
      const elapsedSeconds = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      const loopWidth = primaryGroup?.getBoundingClientRect().width || 0;
      if (loopWidth > 0 && !paused) {
        logicalOffset = (logicalOffset + speedPixelsPerSecond * elapsedSeconds) % loopWidth;
        viewport.scrollLeft = logicalOffset;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    const startTimer = window.setTimeout(() => { frameId = window.requestAnimationFrame(tick); }, 80);
    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(frameId);
      viewport.removeEventListener('pointerenter', pause);
      viewport.removeEventListener('pointerleave', resume);
    };
  }, [bannerVisualItems.length, reduce]);

  const cardOrId = textOf(me?.cardNumber || me?.cardNo || me?.idNumber || me?.id || '');
  const hasFilters = Boolean(query || category || governorate);

  useEffect(() => { setCurrentPage(1); }, [query, category, governorate]);

  function clearFilters() {
    setQuery('');
    setCategory('');
    setGovernorate('');
    setCurrentPage(1);
  }

  function goToPage(page: number) {
    setCurrentPage(page);
    const top = gridTopRef.current;
    if (top) window.scrollTo({ top: top.getBoundingClientRect().top + window.scrollY - 90, behavior: reduce ? 'auto' : 'smooth' });
  }

  const chipOptions = [{ value: '', label: isArabic ? 'الكل' : 'All' }, ...categoryOptions];
  const PrevIcon = isArabic ? ChevronRightRoundedIcon : ChevronLeftRoundedIcon;
  const NextIcon = isArabic ? ChevronLeftRoundedIcon : ChevronRightRoundedIcon;

  return (
    <PublicShell watermarkText={cardOrId} page="offers">
      <main className="ui-main">
        <div className="ui-container">
          <motion.header
            className="ui-catalog-head ui-box"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <span className="ui-eyebrow">{isArabic ? 'شبكة الامتيازات' : 'Privilege network'}</span>
              <h1 className="ui-display">{isArabic ? <>اكتشف <span className="ui-gold-text">امتيازاتك</span></> : <>Discover your <span className="ui-gold-text">privileges</span></>}</h1>
              <p className="ui-lead">{isArabic ? 'ابحث بالاسم أو العنوان أو أي تفصيلة، ثم افتح المكان لترى الخصم والفروع.' : 'Search by name, address or any detail, then open a place to see its discount and branches.'}</p>
            </div>
            <div className="ui-stat">
              <strong>{loading ? '—' : <CountUp value={places.length} />}</strong>
              <span>{isArabic ? 'مكان وعرض متاح' : 'places & offers'}</span>
            </div>
          </motion.header>

          {bannerArrivals.length > 0 && (
            <motion.section
              className="ui-arrivals"
              aria-label="New Arrival and Coming Soon"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ui-arrivals-label">
                <strong>{isArabic ? 'وصل حديثًا' : 'New arrivals'}</strong>
                <span>{isArabic ? 'وقريبًا في الشبكة' : '& coming soon'}</span>
              </div>
              <div className="ui-arrivals-viewport" ref={arrivalViewportRef}>
                <div className="ui-arrivals-track">
                  {[0, 1].map((groupIndex) => (
                    <div className="ui-arrivals-group" key={`arrival-group-${groupIndex}`} data-arrival-sequence={groupIndex === 0 ? 'primary' : 'duplicate'} aria-hidden={groupIndex === 1 || undefined}>
                      {bannerVisualItems.map((arrival, index) => {
                        const duplicate = groupIndex === 1 || index >= bannerArrivals.length;
                        return (
                          <a
                            key={`arrival-${groupIndex}-${arrival.id || arrival.title}-${index}`}
                            href={textOf(arrival.targetUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${isArabic ? 'فتح رابط' : 'Open link'} ${textOf(arrival.title) || 'New Arrival'}`}
                            aria-hidden={duplicate || undefined}
                            tabIndex={duplicate ? -1 : undefined}
                            className="ui-arrival"
                            data-rg-logo-transition="true"
                          >
                            <LogoImage item={arrival} />
                          </a>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          <section className="ui-panel ui-panel--glass ui-filters" aria-label={t('filters')}>
            <div className="ui-filters-row">
              <div className="ui-input-wrap ui-search">
                <SearchRoundedIcon />
                <input
                  className="ui-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isArabic ? 'ابحث بالاسم، العنوان، الخصم أو الفرع…' : 'Search name, address, discount or branch…'}
                  aria-label={isArabic ? 'بحث شامل في الأماكن والعروض' : 'Search all places and offers'}
                />
                {query && <button type="button" className="ui-input-action" onClick={() => setQuery('')} aria-label={t('clear')}><CloseRoundedIcon /></button>}
              </div>
              <select className="ui-select" value={governorate} onChange={(event) => setGovernorate(event.target.value)} aria-label={t('allGovernorates')}>
                <option value="">{t('allGovernorates')}</option>
                {governorateOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select className="ui-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label={t('allCategories')}>
                <option value="">{t('allCategories')}</option>
                {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button type="button" className="ui-btn ui-btn--ghost" onClick={clearFilters} disabled={!hasFilters} style={{ height: 48 }}>{t('clear')}</button>
            </div>
            <div className="ui-chips" role="toolbar" aria-label={t('allCategories')}>
              {chipOptions.map((item) => {
                const active = category === item.value;
                return (
                  <button type="button" key={item.value || 'all'} className="ui-chip-btn" aria-pressed={active} onClick={() => setCategory(item.value)}>
                    {active && <motion.span layoutId="ui-chip-pill" className="ui-nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>

          <div ref={gridTopRef} />
          {!loading && (
            <p className="ui-muted" style={{ margin: '22px 0 0', fontSize: 13.5 }} aria-live="polite">
              {hasFilters
                ? (isArabic ? `${filteredPlaces.length} نتيجة مطابقة` : `${filteredPlaces.length} matching results`)
                : (isArabic ? `عرض ${visiblePlaces.length} من ${filteredPlaces.length}` : `Showing ${visiblePlaces.length} of ${filteredPlaces.length}`)}
            </p>
          )}

          <section className="ui-grid" aria-label={t('places')} style={{ marginTop: 12 }}>
            {loading && Array.from({ length: 8 }, (_, i) => <div key={i} className="ui-skeleton" />)}
            {!loading && !visiblePlaces.length && (
              <div className="ui-empty">
                <TravelExploreRoundedIcon />
                <strong style={{ color: 'var(--ui-text)' }}>{isArabic ? 'لا توجد نتائج' : 'No results'}</strong>
                <span>{isArabic ? 'جرّب كلمة بحث أخرى أو امسح الفلاتر.' : 'Try another search term or clear the filters.'}</span>
                {hasFilters && <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={clearFilters} style={{ marginTop: 6 }}>{t('clear')}</button>}
              </div>
            )}
            {visiblePlaces.map((place, index) => (
              <PlaceTile key={`${safePage}-${place.id || pickName(place)}`} place={place} index={index} label={t('openDetails')} reduce={reduce} />
            ))}
          </section>

          {totalPages > 1 && (
            <nav className="ui-pager" aria-label={isArabic ? 'صفحات الأماكن' : 'Place pages'}>
              <button type="button" className="ui-page" disabled={safePage <= 1} onClick={() => goToPage(Math.max(1, safePage - 1))} aria-label={t('previous')}>
                <PrevIcon /><span className="ui-hide-sm">{t('previous')}</span>
              </button>
              {pageItems.map((item, index) => item === 'ellipsis' ? (
                <span className="ui-page-dots" key={`ellipsis-${index}`}>…</span>
              ) : (
                <button type="button" key={item} className="ui-page" onClick={() => goToPage(item)} aria-current={item === safePage ? 'page' : undefined}>{item}</button>
              ))}
              <button type="button" className="ui-page" disabled={safePage >= totalPages} onClick={() => goToPage(Math.min(totalPages, safePage + 1))} aria-label={t('next')}>
                <span className="ui-hide-sm">{t('next')}</span><NextIcon />
              </button>
            </nav>
          )}
        </div>
      </main>
    </PublicShell>
  );
}
