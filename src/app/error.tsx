'use client';

import StatusScreen from '@/components/ui/StatusScreen';
import { useUiPreferences } from '@/components/UiPreferences';

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  const { language } = useUiPreferences();
  const ar = language === 'ar';
  return (
    <StatusScreen
      code={ar ? 'خطأ' : 'Error'}
      title={ar ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
      body={ar ? 'نعتذر عن ذلك. حاول مرة أخرى، وإذا تكررت المشكلة تواصل مع الدعم.' : 'Sorry about that. Please try again, and contact support if it keeps happening.'}
      action={{ label: ar ? 'إعادة المحاولة' : 'Try again', onClick: reset }}
    />
  );
}
