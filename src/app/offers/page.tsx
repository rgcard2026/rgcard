
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import PublicShell from '@/components/PublicShell';
import { useUiPreferences } from '@/components/UiPreferences';

type AnyItem = Record<string, any>;
type PageItem = number | 'ellipsis';
type ArrivalBannerDesign = {
  designArrivalBannerWidth: number;
  designArrivalBannerHeight: number;
  designArrivalBannerRadius: number;
  designArrivalBannerOpacity: number;
  designArrivalBannerStartColor: string;
  designArrivalBannerEndColor: string;
  designArrivalBannerTextColor: string;
  designArrivalBannerAccentColor: string;
  designArrivalBannerCardColor: string;
  designArrivalLogoWidth: number;
  designArrivalLogoHeight: number;
  designArrivalLogoRadius: number;
};

const DEFAULT_ARRIVAL_DESIGN: ArrivalBannerDesign = {
  designArrivalBannerWidth: 100,
  designArrivalBannerHeight: 0,
  designArrivalBannerRadius: 26,
  designArrivalBannerOpacity: 100,
  designArrivalBannerStartColor: '#070A12',
  designArrivalBannerEndColor: '#5F3F15',
  designArrivalBannerTextColor: '#FFFAF1',
  designArrivalBannerAccentColor: '#D6A64F',
  designArrivalBannerCardColor: '#FFFFFF',
  designArrivalLogoWidth: 116,
  designArrivalLogoHeight: 70,
  designArrivalLogoRadius: 16
};

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
    .replace(/[\u064B-\u065F\u0670]/g, '')
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

function PlaceLogo({ place, size = 'catalogue' }: { place: AnyItem; size?: 'banner' | 'catalogue' }) {
  const [failed, setFailed] = useState(false);
  const logo = pickLogo(place);
  const name = pickName(place);
  return (
    <span className={`placeLogo ${size}`}>
      {logo && !failed ? <img src={logo} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 1) return [];
  const current = currentPage + 1;
  const pages: number[] = [];
  const add = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && !pages.includes(pageNumber)) pages.push(pageNumber);
  };
  add(1); add(2); add(3);
  for (let pageNumber = current - 1; pageNumber <= current + 1; pageNumber += 1) add(pageNumber);
  add(totalPages - 1); add(totalPages);
  pages.sort((a, b) => a - b);
  return pages.flatMap((pageNumber, index) => {
    const previous = pages[index - 1] || 0;
    return index > 0 && pageNumber - previous > 1 ? ['ellipsis' as const, pageNumber] : [pageNumber];
  });
}

export default function OffersPage() {
  const { language, t } = useUiPreferences();
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
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [arrivalDesign, setArrivalDesign] = useState<ArrivalBannerDesign>(DEFAULT_ARRIVAL_DESIGN);
  // Keep the user catalogue compact: at most 10 places/offers per page.
  const pageSize = 10;
  const arrivalViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [meData, placesData, categoriesData, governoratesData, arrivalsData, settingsData] = await Promise.all([
        fetchJson('/api/me'),
        fetchJson('/api/places'),
        fetchJson('/api/categories'),
        fetchJson('/api/governorates'),
        fetchJson('/api/new-arrivals'),
        fetchJson('/api/settings')
      ]);
      if (!mounted) return;
      if (settingsData?.data) {
        setArrivalDesign({ ...DEFAULT_ARRIVAL_DESIGN, ...settingsData.data });
      }
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
      fetch('/api/logs/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'OPEN_OFFERS_PAGE' })
      }).catch(() => null);
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
  // A long sequence is duplicated once. Moving exactly half the track lands at
  // the identical second sequence, producing a continuous loop with no blank reset.
  const bannerArrivals = useMemo(
    () => newArrivals.filter((item) => textOf(item?.logoUrl) && textOf(item?.targetUrl)),
    [newArrivals]
  );
  const bannerVisualItems = useMemo(() => {
    if (!bannerArrivals.length) return [] as AnyItem[];
    // A sufficiently long, repeated sequence guarantees that the viewport is always
    // filled even when the admin has only one logo in the standalone banner.
    const minimumCardsPerGroup = 18;
    const repeats = Math.max(1, Math.ceil(minimumCardsPerGroup / bannerArrivals.length));
    return Array.from({ length: repeats }, () => bannerArrivals).flat();
  }, [bannerArrivals]);
  const arrivalBannerStyle = {
    '--rg-arrival-banner-width': `${Math.max(40, Math.min(100, Number(arrivalDesign.designArrivalBannerWidth) || 100))}%`,
    '--rg-arrival-banner-height': Number(arrivalDesign.designArrivalBannerHeight) > 0
      ? `${Math.min(600, Number(arrivalDesign.designArrivalBannerHeight))}px`
      : 'auto',
    '--rg-arrival-banner-radius': `${Math.max(0, Math.min(60, Number(arrivalDesign.designArrivalBannerRadius) || 0))}px`,
    '--rg-arrival-banner-opacity': `${Math.max(0, Math.min(100, Number(arrivalDesign.designArrivalBannerOpacity) || 0))}%`,
    '--rg-arrival-banner-start': arrivalDesign.designArrivalBannerStartColor || DEFAULT_ARRIVAL_DESIGN.designArrivalBannerStartColor,
    '--rg-arrival-banner-end': arrivalDesign.designArrivalBannerEndColor || DEFAULT_ARRIVAL_DESIGN.designArrivalBannerEndColor,
    '--rg-arrival-banner-text': arrivalDesign.designArrivalBannerTextColor || DEFAULT_ARRIVAL_DESIGN.designArrivalBannerTextColor,
    '--rg-arrival-banner-accent': arrivalDesign.designArrivalBannerAccentColor || DEFAULT_ARRIVAL_DESIGN.designArrivalBannerAccentColor,
    '--rg-arrival-banner-card': arrivalDesign.designArrivalBannerCardColor || DEFAULT_ARRIVAL_DESIGN.designArrivalBannerCardColor,
    '--rg-arrival-logo-width': `${Math.max(60, Math.min(240, Number(arrivalDesign.designArrivalLogoWidth) || 116))}px`,
    '--rg-arrival-logo-height': `${Math.max(40, Math.min(160, Number(arrivalDesign.designArrivalLogoHeight) || 70))}px`,
    '--rg-arrival-logo-radius': `${Math.max(0, Math.min(40, Number(arrivalDesign.designArrivalLogoRadius) || 0))}px`
  } as React.CSSProperties;

  // v3.9.34 — true endless ticker.
  // Keep a separate floating-point logical offset. Some browsers round scrollLeft
  // to whole pixels; calculating the next frame from viewport.scrollLeft would then
  // repeatedly round tiny increments back to zero and make the banner look frozen.
  // The second group is an exact copy of the first, so modulo wrapping at the first
  // group's measured width is visually seamless and never pauses or reaches an end.
  useEffect(() => {
    const viewport = arrivalViewportRef.current;
    if (!viewport || !bannerVisualItems.length) return;

    let frameId = 0;
    let previousTime = 0;
    let logicalOffset = 0;
    const speedPixelsPerSecond = 20;
    const primaryGroup = viewport.querySelector<HTMLElement>('[data-arrival-sequence="primary"]');

    const tick = (now: number) => {
      if (!previousTime) previousTime = now;
      const elapsedSeconds = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;

      const loopWidth = primaryGroup?.getBoundingClientRect().width || 0;
      if (loopWidth > 0) {
        logicalOffset = (logicalOffset + speedPixelsPerSecond * elapsedSeconds) % loopWidth;
        viewport.scrollLeft = logicalOffset;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      logicalOffset = 0;
      viewport.scrollLeft = 0;
      previousTime = 0;
      frameId = window.requestAnimationFrame(tick);
    };

    // Start after layout and image frames are available.
    const startTimer = window.setTimeout(start, 80);
    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(frameId);
    };
  }, [bannerVisualItems.length]);

  const shownCategories = showMoreCategories ? categoryOptions : categoryOptions.slice(0, 8);
  const cardOrId = textOf(me?.cardNumber || me?.cardNo || me?.idNumber || me?.id || '');

  useEffect(() => { setCurrentPage(1); }, [query, category, governorate]);

  function clearFilters() {
    setQuery('');
    setCategory('');
    setGovernorate('');
    setCurrentPage(1);
  }

  return (
    <PublicShell watermarkText={cardOrId} page="offers">
      <main className="offersPage" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <section className="headlineCard wrap">
          <h2>{language === 'ar' ? 'أماكن وعروض RG-Card' : 'RG-Card places & offers'}</h2>
          <p>{language === 'ar' ? 'ابحث بالاسم أو العنوان أو أي تفاصيل داخل المكان، ثم اضغط على لوجو المكان لعرض كل التفاصيل.' : 'Search by name, address, or any detail, then select a logo to view the full place details.'}</p>
        </section>

        {bannerArrivals.length > 0 && (
          <section className="arrivalBanner wrap" style={arrivalBannerStyle} aria-label="New Arrival and Coming Soon">
            <div className="arrivalHeader" aria-hidden="true">
              <span className="arrivalSpark">✦</span>
              <span className="arrivalTitle">{language === 'ar' ? 'وصل حديثًا / قريبًا' : 'NEW ARRIVALS / COMING SOON'}</span>
              <span className="arrivalSpark">✦</span>
            </div>
            <div className="arrivalViewport" ref={arrivalViewportRef}>
              <div className="arrivalTrack">
                {[0, 1].map((groupIndex) => (
                  <div
                    className="arrivalGroup"
                    key={`arrival-group-${groupIndex}`}
                    data-arrival-sequence={groupIndex === 0 ? 'primary' : 'duplicate'}
                    aria-hidden={groupIndex === 1 || undefined}
                  >
                    {bannerVisualItems.map((arrival, index) => {
                      const repeatedVisual = index >= bannerArrivals.length;
                      const duplicateForAssistiveTech = groupIndex === 1 || repeatedVisual;
                      const targetUrl = textOf(arrival.targetUrl);
                      return (
                        <a
                          key={`arrival-${groupIndex}-${arrival.id || arrival.title}-${index}`}
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${language === 'ar' ? 'فتح رابط' : 'Open link'} ${textOf(arrival.title) || 'New Arrival'}`}
                          aria-hidden={duplicateForAssistiveTech || undefined}
                          tabIndex={duplicateForAssistiveTech ? -1 : undefined}
                          className="arrivalLogoLink"
                          data-rg-logo-transition="true"
                        >
                          <PlaceLogo place={arrival} size="banner" />
                        </a>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="filters wrap">
          <div className="searchRow">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={language === 'ar' ? 'ابحث بالاسم، العنوان، الوصف، الخصم، الفروع أو أي تفاصيل' : 'Search by name, address, details, discount, or branch'}
              aria-label={language === 'ar' ? 'بحث شامل في الأماكن والعروض' : 'Search all places and offers'}
            />
            <button type="button" onClick={clearFilters}>{t('clear')}</button>
          </div>
          <div className="selectRow">
            <select value={governorate} onChange={(event) => setGovernorate(event.target.value)}>
              <option value="">{t('allGovernorates')}</option>
              {governorateOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{t('allCategories')}</option>
              {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="chipsRow" aria-label={t('allCategories')}>
            <button type="button" className={!category ? 'active' : ''} onClick={() => setCategory('')}>{language === 'ar' ? 'كل العروض' : 'All offers'}</button>
            {shownCategories.map((item) => (
              <button type="button" key={item.value} className={category === item.value ? 'active' : ''} onClick={() => setCategory(item.value)}>{item.label}</button>
            ))}
            {categoryOptions.length > 8 && <button type="button" onClick={() => setShowMoreCategories((value) => !value)}>{showMoreCategories ? (language === 'ar' ? 'إخفاء' : 'Show less') : (language === 'ar' ? '+ المزيد' : '+ More')}</button>}
          </div>
        </section>

        <section className="placesGrid wrap" aria-label={t('places')}>
          {loading && <div className="empty">{language === 'ar' ? 'جاري تحميل الأماكن...' : 'Loading places...'}</div>}
          {!loading && !visiblePlaces.length && <div className="empty">{language === 'ar' ? 'لا توجد أماكن أو عروض مطابقة للبحث الحالي.' : 'No places or offers match your current search.'}</div>}
          {visiblePlaces.map((place, index) => (
            <a className="placeLogoTile rg-logo-intro" data-rg-logo-transition="true" style={{ '--rg-logo-delay': `${(index % 10) * 55}ms` } as React.CSSProperties} href={`/places/${place.id}`} key={place.id || pickName(place)} title={pickName(place)} aria-label={`${t('openDetails')}: ${pickName(place)}`}>
              <PlaceLogo place={place} size="catalogue" />
              <strong className="placeName">{pickName(place)}</strong>
            </a>
          ))}
        </section>

        {totalPages > 1 && (
          <nav className="rgPagination" aria-label={language === 'ar' ? 'صفحات الأماكن' : 'Place pages'} dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <button type="button" className="rgPageBtn rgPageNav" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>{t('previous')}</button>
            <div className="rgPageNumbers">
              {pageItems.map((item, index) => item === 'ellipsis' ? (
                <span className="rgPageDots" key={`ellipsis-${index}`}>...</span>
              ) : (
                <button type="button" key={item} className={`rgPageBtn ${item === safePage ? 'active' : ''}`} onClick={() => setCurrentPage(item)} aria-current={item === safePage ? 'page' : undefined}>{item}</button>
              ))}
            </div>
            <button type="button" className="rgPageBtn rgPageNav" disabled={safePage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>{t('next')}</button>
          </nav>
        )}

        <style jsx global>{`
          .offersPage { min-height: 100vh; background: var(--rg-canvas); color: var(--rg-text); padding: clamp(18px, 3vw, 34px) 0 42px; position: relative; overflow: hidden; }
          .wrap { position: relative; z-index: 1; width: min(1120px, calc(100% - 32px)); margin-inline: auto; }
          .headlineCard, .filters { margin-top: 16px; background: var(--rg-surface-soft); border: 1px solid var(--rg-accent-border); border-radius: 24px; padding: clamp(15px, 2.6vw, 22px); box-shadow: 0 20px 50px rgba(33,25,10,.08); }
          .headlineCard h2 { margin: 0 0 6px; font-size: clamp(24px, 4vw, 32px); line-height: 1.25; }
          .headlineCard p { margin: 0; color: var(--rg-subtle); line-height: 1.75; }

          /* v3.9.27 — logo-only, continuously moving New Arrival / Coming Soon carousel. */
          .arrivalBanner { position: relative; isolation: isolate; width: var(--rg-arrival-banner-width, 100%); max-width: min(1120px, calc(100% - 32px)); height: var(--rg-arrival-banner-height, auto); min-height: 0; margin-top: 14px; border: 1px solid color-mix(in srgb, var(--rg-arrival-banner-accent, #d6a64f) 46%, transparent); border-radius: var(--rg-arrival-banner-radius, 26px); padding: 0; color: var(--rg-arrival-banner-text, #fffaf1); background: transparent; box-shadow: 0 18px 45px rgba(33,25,10,.16); overflow: hidden; }
          .arrivalBanner::before { content: ''; position: absolute; z-index: -1; inset: 0; border-radius: inherit; opacity: var(--rg-arrival-banner-opacity, 100%); background: radial-gradient(circle at 95% 20%, color-mix(in srgb, var(--rg-arrival-banner-end, #5f3f15) 42%, transparent), transparent 24%), radial-gradient(circle at 8% 100%, color-mix(in srgb, var(--rg-arrival-banner-start, #070a12) 45%, transparent), transparent 31%), linear-gradient(112deg, var(--rg-arrival-banner-start, #070a12) 0%, var(--rg-arrival-banner-end, #5f3f15) 100%); }
          .arrivalHeader { position: relative; z-index: 1; min-height: 38px; display: flex; align-items: center; justify-content: center; gap: 9px; padding: 8px 16px; border-bottom: 1px solid color-mix(in srgb, var(--rg-arrival-banner-text, #fffaf1) 18%, transparent); background: linear-gradient(90deg, color-mix(in srgb, var(--rg-arrival-banner-start, #070a12) 4%, transparent), color-mix(in srgb, var(--rg-arrival-banner-end, #5f3f15) 10%, transparent)); }
          .arrivalTitle { color: var(--rg-arrival-banner-accent, #d6a64f); font-size: clamp(13px, 1.3vw, 16px); font-weight: 950; letter-spacing: .15em; text-transform: uppercase; white-space: nowrap; }
          .arrivalSpark { color: var(--rg-arrival-banner-accent, #d6a64f); opacity: .9; font-size: 13px; line-height: 1; }
          /* v3.9.33 — JS ticker. Unlike a CSS transform loop, it wraps at the exact
             measured width of an identical sequence, so there is no cut, pause or blank gap. */
          .arrivalViewport { --arrival-gap: 10px; width: 100%; overflow: hidden; padding: 14px 0 16px; direction: ltr; scroll-behavior: auto; scrollbar-width: none; -webkit-mask-image: none; mask-image: none; }
          .arrivalViewport::-webkit-scrollbar { display: none; }
          .arrivalTrack { display: flex; align-items: center; width: max-content; min-width: max-content; direction: ltr; gap: 0; padding: 0; animation: none !important; transform: none !important; will-change: auto; }
          .arrivalGroup { display: flex; align-items: center; flex: 0 0 auto; flex-wrap: nowrap; gap: var(--arrival-gap); padding: 0 var(--arrival-gap) 0 0; }
          .arrivalLogoLink { position: relative; z-index: 1; flex: 0 0 var(--rg-arrival-logo-width, 116px); width: var(--rg-arrival-logo-width, 116px); height: var(--rg-arrival-logo-height, 70px); display: grid; place-items: center; padding: 8px; border-radius: var(--rg-arrival-logo-radius, 16px); background: var(--rg-arrival-banner-card, #fff); border: 1px solid var(--rg-arrival-banner-accent, #d6a64f); box-sizing: border-box; overflow: hidden; box-shadow: 0 12px 26px rgba(0,0,0,.22); text-decoration: none; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
          .arrivalLogoLink:hover, .arrivalLogoLink:focus-visible { transform: translateY(-3px); border-color: var(--rg-accent-border); box-shadow: 0 17px 30px rgba(0,0,0,.33); outline: none; }

          /* Fixed frames: the logo itself is restrained, never allowed to overflow the card. */
          .placeLogo { display: grid; place-items: center; min-width: 0; min-height: 0; overflow: hidden; background: #fffdf7; color: #9a6b22; font-weight: 950; box-sizing: border-box; }
          .placeLogo.banner { width: 100%; height: 100%; border-radius: var(--rg-arrival-logo-radius, 16px); }
          .placeLogo.catalogue { width: 128px; max-width: 100%; height: 106px; border-radius: 18px; border: 1px solid var(--rg-accent-border); background: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.72); }
          .placeLogo > img { display: block !important; image-rendering: auto; transform: none !important; width: auto !important; height: auto !important; max-width: 82% !important; max-height: 82% !important; object-fit: contain !important; object-position: center !important; flex: 0 0 auto; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important; }
          .placeLogo.banner > img { max-width: 86% !important; max-height: 80% !important; }
          .placeLogo.catalogue > img { max-width: 80% !important; max-height: 80% !important; }
          .placeLogo > span { display: grid; place-items: center; width: 100%; height: 100%; border-radius: inherit; background: linear-gradient(135deg,#fff7df,#f0d58e); color: #2a1b08; font-size: clamp(18px, 3vw, 28px); }

          .filters { display: grid; gap: 12px; }
          .searchRow, .selectRow { display: grid; gap: 10px; }
          .searchRow { grid-template-columns: 1fr auto; }
          .selectRow { grid-template-columns: 1fr 1fr; }
          .searchRow input, .selectRow select { min-width: 0; width: 100%; border: 1px solid rgba(17,24,39,.18); border-radius: 16px; background: rgba(255,255,255,.76); padding: 13px 14px; font: inherit; outline: none; box-sizing: border-box; }
          .searchRow input:focus, .selectRow select:focus { border-color: var(--rg-accent-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rg-accent-border) 22%, transparent); }
          .searchRow button { border: 0; border-radius: 16px; background: var(--rg-brand-gradient); color: #fff; padding: 0 22px; font-weight: 900; cursor: pointer; }
          .chipsRow { display: flex; gap: 9px; overflow-x: auto; padding-bottom: 4px; }
          .chipsRow::-webkit-scrollbar { height: 5px; }
          .chipsRow::-webkit-scrollbar-thumb { background: rgba(17,24,39,.22); border-radius: 999px; }
          .chipsRow button { border: 1px solid rgba(17,24,39,.22); background: rgba(255,255,255,.76); border-radius: 999px; padding: 9px 14px; font-weight: 800; white-space: nowrap; cursor: pointer; }
          .chipsRow button.active { border-color: transparent; background: var(--rg-brand-gradient); color: #fff; }
          .placesGrid { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: clamp(12px, 2vw, 18px); }
          .placeLogoTile { min-height: 182px; border-radius: 28px; background: var(--rg-surface-soft); border: 1px solid var(--rg-accent-border); box-shadow: 0 16px 38px rgba(33,25,10,.065); padding: 16px 14px; gap: 10px; color: var(--rg-text); }
          .arrivalLogoLink, .placeLogoTile { display: grid; place-items: center; text-decoration: none; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
          .placeLogoTile:hover, .placeLogoTile:focus-visible { transform: translateY(-3px); border-color: var(--rg-accent-border); box-shadow: 0 16px 30px rgba(17,24,39,.16); outline: none; }
          .placeName { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 100%; min-height: 38px; text-align: center; font-size: 14px; line-height: 1.35; font-weight: 950; }
          .empty { grid-column: 1 / -1; padding: 36px 16px; text-align: center; color: var(--rg-subtle); background: var(--rg-surface-soft); border: 1px dashed rgba(17,24,39,.2); border-radius: 22px; }
          .rgPagination { position: relative; z-index: 1; width: min(1120px, calc(100% - 32px)); margin: 22px auto 0; display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
          .rgPageNumbers { display: flex; align-items: center; justify-content: center; gap: 7px; flex-wrap: wrap; }
          .rgPageBtn { min-width: 40px; height: 38px; padding: 0 11px; border-radius: 12px; border: 1px solid rgba(17,24,39,.2); background: rgba(255,255,255,.8); color: #111827; font-weight: 900; cursor: pointer; }
          .rgPageBtn.active { background: var(--rg-brand-gradient); color: #fff; border-color: transparent; }
          .rgPageBtn:disabled { opacity: .45; cursor: not-allowed; }
          .rgPageDots { color: #666; font-weight: 950; padding-inline: 2px; }
          @media (max-width: 700px) {
            .wrap, .rgPagination { width: min(100% - 18px, 1120px); }
            .arrivalBanner.wrap { width: var(--rg-arrival-banner-width, 100%); max-width: min(100% - 18px, 1120px); }
            .searchRow, .selectRow { grid-template-columns: 1fr; }
            .searchRow button { min-height: 46px; }
            .offersPage { padding-top: 12px; }
            .headlineCard { margin-top: 10px; padding: 15px; }
            .headlineCard h2 { font-size: 22px; }
            .headlineCard p { font-size: 13px; line-height: 1.65; }
            .placesGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
            .placeLogoTile { min-height: 172px; padding: 12px 10px; border-radius: 21px; gap: 9px; }
            .placeLogo.catalogue { width: 106px; height: 86px; border-radius: 15px; }
            .placeLogo > img { max-width: 78% !important; max-height: 78% !important; }
            .placeLogo.banner > img { max-width: 84% !important; max-height: 78% !important; }
            .placeName { min-height: 34px; font-size: 12px; line-height: 1.35; }
            .headlineCard, .filters { border-radius: 20px; }
            .arrivalHeader { min-height: 36px; padding: 8px 11px; }
            .arrivalTitle { font-size: 10px; letter-spacing: .11em; }
            .arrivalViewport { --arrival-gap: 8px; padding: 11px 0 13px; }
            .arrivalGroup { gap: var(--arrival-gap); padding: 0 var(--arrival-gap) 0 0; }
            .arrivalLogoLink { flex-basis: min(var(--rg-arrival-logo-width, 116px), 36vw); width: min(var(--rg-arrival-logo-width, 116px), 36vw); height: min(var(--rg-arrival-logo-height, 70px), 22vw); padding: 7px; }
            .rgPagination { gap: 7px; }
            .rgPageBtn { min-width: 36px; height: 36px; padding: 0 9px; }
          }
          @media (min-width: 520px) and (max-width: 700px) { .placesGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
          @media (max-width: 360px) { .placeLogo.catalogue { width: 90px; height: 72px; } }
        `}</style>
      </main>
    </PublicShell>
  );
}
