'use client';

import Link from 'next/link';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { useUiPreferences } from './UiPreferences';

export default function AdminDashboardExportActions() {
  const { language } = useUiPreferences();
  const ar = language === 'ar';

  return (
    <section className="ui-panel ui-panel--pad ui-hairline-top ui-dash-export">
      <div style={{ display: 'grid', gap: 4 }}>
        <h3 className="ui-h3">{ar ? 'الكروت والتصدير' : 'Cards & exports'}</h3>
        <p className="ui-muted" style={{ margin: 0, fontSize: 13.5 }}>{ar ? 'اعرض كل كروت الأعضاء في ملف PDF واحد، أو صدّر بيانات الأعضاء والأماكن والعروض.' : 'View every member card in one PDF, or export members, places and offers.'}</p>
      </div>
      <div className="ui-dash-quick">
        <a href="/api/admin/users/cards-pdf?includeInactive=1" target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--ghost"><PictureAsPdfRoundedIcon />{ar ? 'عرض PDF' : 'View PDF'}</a>
        <Link href="/admin/exports" className="ui-btn ui-btn--primary"><DownloadRoundedIcon />{ar ? 'مركز التصدير' : 'Export center'}</Link>
      </div>
    </section>
  );
}
