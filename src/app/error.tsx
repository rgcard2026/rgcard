'use client';

import StatusScreen from '@/components/ui/StatusScreen';
import { useUiPreferences } from '@/components/UiPreferences';

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  const { language, t } = useUiPreferences();
  const ar = language === 'ar';
  return (
    <StatusScreen
      code={t('adm_359')}
      title={t('adm_360')}
      body={t('adm_361')}
      action={{ label: t('adm_362'), onClick: reset }}
    />
  );
}
