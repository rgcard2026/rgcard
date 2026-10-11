'use client';

import StatusScreen from '@/components/ui/StatusScreen';
import { useUiPreferences } from '@/components/UiPreferences';

export default function NotFound() {
  const { language } = useUiPreferences();
  const ar = language === 'ar';
  return (
    <StatusScreen
      code="404"
      title={ar ? 'الصفحة غير موجودة' : 'Page not found'}
      body={ar ? 'ربما تم نقل الصفحة أو أن الرابط غير صحيح.' : 'The page may have moved, or the link is incorrect.'}
      action={{ label: ar ? 'العودة لبطاقتي' : 'Back to my card', href: '/valid' }}
    />
  );
}
