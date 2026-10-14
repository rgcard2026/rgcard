'use client';

import Link from 'next/link';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { useUiPreferences } from './UiPreferences';

export default function AdminDashboardExportActions() {
  const { language, t } = useUiPreferences();
  const ar = language === 'ar';

  return (
    <section className="ui-panel ui-panel--pad ui-hairline-top ui-dash-export">
      <div style={{ display: 'grid', gap: 4 }}>
        <h3 className="ui-h3">{t('adm_345')}</h3>
        <p className="ui-muted" style={{ margin: 0, fontSize: 13.5 }}>{t('adm_346')}</p>
      </div>
      <div className="ui-dash-quick">
        <a href="/api/admin/users/cards-pdf?includeInactive=1" target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--ghost"><PictureAsPdfRoundedIcon />{t('adm_347')}</a>
        <Link href="/admin/exports" className="ui-btn ui-btn--primary"><DownloadRoundedIcon />{t('adm_348')}</Link>
      </div>
    </section>
  );
}
