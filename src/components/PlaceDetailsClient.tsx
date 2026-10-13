'use client';

import * as React from 'react';
import Link from 'next/link';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import PublicShell from './PublicShell';
import BranchSelector from './BranchSelector';
import Reveal from './ui/Reveal';
import { useUiPreferences } from './UiPreferences';

type Gov = { id: number; name: string };
type Branch = { id: number; name: string; address?: string | null; phone?: string | null; mapUrl?: string | null; governorate: Gov };
type Offer = { id: number; title: string; description?: string | null; discountText: string };

type Props = {
  cardNumber: string;
  place: { id: number; name: string; description?: string | null; logoUrl?: string | null; categoryName: string };
  discount: string;
  hasCustomDiscount: boolean;
  offers: Offer[];
  governorates: Gov[];
  branches: Branch[];
};

export default function PlaceDetailsClient({ cardNumber, place, discount, hasCustomDiscount, offers, governorates, branches }: Props) {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';
  const [logoFailed, setLogoFailed] = React.useState(false);

  return (
    <PublicShell watermarkText={cardNumber} page={`place-${place.id}`}>
      <main className="ui-main">
        <div className="ui-container">
          <Link href="/offers" className="ui-back">
            <ArrowForwardRoundedIcon className="ui-flip-ltr" />
            {isArabic ? 'كل الأماكن' : 'All places'}
          </Link>

          <Reveal className="ui-panel ui-hairline-top ui-place-hero ui-box">
            <div className="ui-place-logo">
              {place.logoUrl && !logoFailed
                ? <img src={place.logoUrl} alt={place.name} onError={() => setLogoFailed(true)} />
                : <StorefrontRoundedIcon style={{ fontSize: 48, color: '#9c7432' }} />}
            </div>
            <div className="ui-place-info">
              <div className="ui-place-tags">
                <span className="ui-chip">{place.categoryName}</span>
                {hasCustomDiscount && <span className="ui-chip ui-chip--success"><VerifiedRoundedIcon style={{ fontSize: 16 }} />{isArabic ? 'خصم خاص لك' : 'Your special rate'}</span>}
              </div>
              <h1 className="ui-display">{place.name}</h1>
            </div>
            <div className="ui-discount">
              <small>{isArabic ? 'خصم الأعضاء' : 'Member discount'}</small>
              <strong>{discount}</strong>
            </div>
          </Reveal>

          <div className="ui-place-grid">
            <Reveal delay={0.05} className="ui-panel ui-panel--pad">
              <div className="ui-panel-title"><LocalOfferRoundedIcon /><h2 className="ui-h3">{isArabic ? 'تفاصيل العرض' : 'Offer details'}</h2></div>
              <p className="ui-desc">{place.description || (isArabic ? 'تفاصيل العرض متاحة لأعضاء RG-Card.' : 'Offer details are available to RG-Card members.')}</p>
              {offers.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  {offers.map((offer) => (
                    <div key={offer.id} className="ui-offer">
                      <div className="ui-offer-top">
                        <strong>{offer.title}</strong>
                        <span className="ui-chip ui-chip--gold">{hasCustomDiscount ? discount : offer.discountText}</span>
                      </div>
                      {offer.description && offer.description !== place.description && <p>{offer.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            <Reveal delay={0.1} className="ui-panel ui-panel--pad">
              <div className="ui-panel-title"><StorefrontRoundedIcon /><h2 className="ui-h3">{isArabic ? 'الفروع المتاحة' : 'Available branches'}</h2></div>
              <BranchSelector governorates={governorates} branches={branches} />
            </Reveal>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
