'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import { useUiPreferences } from './UiPreferences';

type Gov = { id: number; name: string };
type Branch = { id: number; name: string; address?: string | null; phone?: string | null; mapUrl?: string | null; governorate: Gov };

export default function BranchSelector({ governorates, branches }: { governorates: Gov[]; branches: Branch[] }) {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';
  const [governorateId, setGovernorateId] = React.useState<number | ''>(governorates[0]?.id || '');
  const isGlobalBranch = (branch: Branch) => /جميع الفروع|جميع المحافظات|الفروع المتاحة|اونلاين|أونلاين/i.test(branch.name);
  const filtered = governorateId
    ? branches.filter((branch) => branch.governorate.id === Number(governorateId) || isGlobalBranch(branch))
    : branches;

  return (
    <>
      {governorates.length > 0 ? (
        <div className="ui-seg" role="tablist" aria-label={isArabic ? 'اختر المحافظة' : 'Choose governorate'}>
          {governorates.map((gov) => {
            const active = gov.id === governorateId;
            return (
              <button key={gov.id} type="button" role="tab" aria-selected={active} aria-pressed={active} className="ui-chip-btn" onClick={() => setGovernorateId(gov.id)}>
                {active && <motion.span layoutId="ui-gov-pill" className="ui-nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                {gov.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="ui-muted" style={{ margin: '0 0 14px' }}>{isArabic ? 'لم يتم تحديد محافظات لهذا المكان بعد.' : 'No governorates assigned to this place yet.'}</p>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={String(governorateId)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {filtered.map((branch) => (
            <div key={branch.id} className="ui-branch">
              <div style={{ minWidth: 0 }}>
                <div className="ui-branch-name">{branch.name}</div>
                <div className="ui-branch-addr">
                  <LocationOnRoundedIcon />
                  <span>{isGlobalBranch(branch) ? (branch.address || (isArabic ? 'متاح بجميع المحافظات' : 'Available in all governorates')) : `${branch.governorate.name} — ${branch.address || (isArabic ? 'العنوان غير متوفر' : 'Address not available')}`}</span>
                </div>
              </div>
              {(branch.phone || branch.mapUrl) && (
                <div className="ui-branch-actions">
                  {branch.phone && <a className="ui-btn ui-btn--ghost ui-btn--sm" href={`tel:${branch.phone}`}><CallRoundedIcon />{isArabic ? 'اتصال' : 'Call'}</a>}
                  {branch.mapUrl && <a className="ui-btn ui-btn--primary ui-btn--sm" href={branch.mapUrl} target="_blank" rel="noopener noreferrer"><MapRoundedIcon />{isArabic ? 'الخريطة' : 'Map'}</a>}
                </div>
              )}
            </div>
          ))}
          {governorateId !== '' && !filtered.length && (
            <div className="ui-branch" style={{ borderStyle: 'dashed' }}>
              <div>
                <div className="ui-branch-name">{isArabic ? 'المكان متاح في المحافظة المحددة' : 'Available in this governorate'}</div>
                <div className="ui-branch-addr"><span>{isArabic ? 'بيانات الفرع التفصيلية غير مضافة حاليًا.' : 'Detailed branch information has not been added yet.'}</span></div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
