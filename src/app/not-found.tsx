'use client';

import StatusScreen from '@/components/ui/StatusScreen';
import { useUiPreferences } from '@/components/UiPreferences';

export default function NotFound() {
  const { language, t } = useUiPreferences();
  const ar = language === 'ar';
  return (
    <StatusScreen
      code="404"
      title={t('adm_363')}
      body={t('adm_364')}
      action={{ label: t('adm_365'), href: '/valid' }}
    />
  );
}
