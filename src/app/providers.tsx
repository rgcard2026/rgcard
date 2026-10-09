'use client';

import * as React from 'react';
import UiPreferencesProvider from '@/components/UiPreferences';
import BrandRouteMotion from '@/components/BrandRouteMotion';
import DesignThemeRuntime from '@/components/DesignThemeRuntime';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <UiPreferencesProvider><DesignThemeRuntime /><BrandRouteMotion />{children}</UiPreferencesProvider>;
}
