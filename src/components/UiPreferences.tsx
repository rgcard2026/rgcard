'use client';

import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildMuiTheme } from './ui/muiTheme';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

export type UiLanguage = 'ar' | 'en';
export type UiMode = 'light' | 'dark';

type CopyKey =
  | 'dashboard' | 'places' | 'arrivals' | 'users' | 'admins' | 'activityLog' | 'securityAlerts'
  | 'cardDesign' | 'accountSecurity' | 'logout' | 'offers' | 'whatsapp' | 'welcome'
  | 'darkMode' | 'lightMode' | 'language' | 'memberCard' | 'viewOffers' | 'downloadPdf'
  | 'cardValid' | 'activeMembership' | 'search' | 'filters' | 'allCategories' | 'allGovernorates'
  | 'clear' | 'previous' | 'next' | 'openDetails' | 'save' | 'delete' | 'add' | 'close'
  | 'adminSubtitle' | 'newArrivalInfo' | 'details' | 'edit' | 'createPlace' | 'createCategory'
  | 'importCsv' | 'replaceData' | 'addArrival' | 'addAdmin' | 'userActivityLogs' | 'exports' | 'designStudio' | 'appCardSettings'
  // Member-facing: login + change password
  | 'loginTitle' | 'loginSubtitle' | 'loginTrouble' | 'loginEncryptError' | 'loginInvalid' | 'loginServerError'
  | 'loginDevHint' | 'loginCardFromQr' | 'loginCardOrId' | 'loginQrHint' | 'passwordLabel' | 'showPassword'
  | 'hidePassword' | 'verifying' | 'signIn' | 'welcomeBack';

const copy: Record<UiLanguage, Record<CopyKey, string>> = {
  ar: {
    dashboard: 'لوحة التحكم', places: 'الأماكن والعروض', arrivals: 'وصل حديثًا / قريبًا', users: 'المستخدمين والكروت',
    admins: 'المسؤولون والصلاحيات', activityLog: 'سجل الأنشطة', securityAlerts: 'التنبيهات الأمنية',
    cardDesign: 'تصميم الكارت والواتساب', accountSecurity: 'إعدادات الحساب والأمان', logout: 'تسجيل الخروج', offers: 'العروض',
    whatsapp: 'دعم واتساب', welcome: 'مرحبًا بك في RG-Card', darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح',
    language: 'English', memberCard: 'كارت العضوية', viewOffers: 'استعرض العروض', downloadPdf: 'تحميل الكارت PDF',
    cardValid: 'الكارت صالح', activeMembership: 'عضوية فعالة', search: 'بحث', filters: 'البحث والفلاتر',
    allCategories: 'كل الفئات', allGovernorates: 'كل المحافظات', clear: 'مسح', previous: 'السابق', next: 'التالي',
    openDetails: 'فتح التفاصيل', save: 'حفظ', delete: 'حذف', add: 'إضافة', close: 'إغلاق',
    adminSubtitle: 'إدارة بيانات RG-Card من مكان واحد', newArrivalInfo: 'يظهر للمستخدم اللوجو فقط، والضغط عليه يفتح الرابط الذي تحدده.',
    details: 'التفاصيل', edit: 'تعديل', createPlace: 'إضافة مكان', createCategory: 'إضافة فئة', importCsv: 'استيراد CSV',
    replaceData: 'استبدال البيانات', addArrival: 'إضافة عنصر', addAdmin: 'إضافة مسؤول', userActivityLogs: 'سجلات نشاط المستخدم', exports: 'التصدير والكروت', designStudio: 'استوديو التصميم', appCardSettings: 'إعدادات التطبيق والكارت',
    loginTitle: 'تسجيل الدخول', loginSubtitle: 'ادخل رقم البطاقة أو الرقم التعريفي وكلمة المرور.', loginTrouble: 'تواجه مشكلة في الدخول؟',
    loginEncryptError: 'تعذر تشفير بيانات الدخول. استخدم HTTPS أو عطّل التشفير في بيئة التطوير.', loginInvalid: 'بيانات الدخول غير صحيحة',
    loginServerError: 'تعذر الاتصال بالخادم. حاول مرة أخرى.', loginDevHint: 'بيئة تطوير: تشفير طلب الدخول معطّل.',
    loginCardFromQr: 'رقم البطاقة من QR', loginCardOrId: 'رقم البطاقة / الرقم التعريفي',
    loginQrHint: 'تم إدخال رقم البطاقة تلقائيًا من QR. اكتب كلمة المرور فقط.', passwordLabel: 'كلمة المرور',
    showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور', verifying: 'جاري التحقق...', signIn: 'دخول', welcomeBack: 'مرحبًا بعودتك'
  },
  en: {
    dashboard: 'Dashboard', places: 'Places & Offers', arrivals: 'New Arrival / Coming Soon', users: 'Users & Cards',
    admins: 'Admins & Permissions', activityLog: 'Activity Log', securityAlerts: 'Security Alerts',
    cardDesign: 'Card & WhatsApp Design', accountSecurity: 'Account & Security Settings', logout: 'Log out', offers: 'Offers',
    whatsapp: 'WhatsApp support', welcome: 'Welcome to RG-Card', darkMode: 'Dark mode', lightMode: 'Light mode',
    language: 'العربية', memberCard: 'Membership Card', viewOffers: 'Browse offers', downloadPdf: 'Download card PDF',
    cardValid: 'Your card is valid', activeMembership: 'Active membership', search: 'Search', filters: 'Search & filters',
    allCategories: 'All categories', allGovernorates: 'All governorates', clear: 'Clear', previous: 'Previous', next: 'Next',
    openDetails: 'Open details', save: 'Save', delete: 'Delete', add: 'Add', close: 'Close',
    adminSubtitle: 'Manage RG-Card data from one place', newArrivalInfo: 'Only the logo is shown to users; selecting it opens the link you choose.',
    details: 'Details', edit: 'Edit', createPlace: 'Add place', createCategory: 'Add category', importCsv: 'Import CSV',
    replaceData: 'Replace data', addArrival: 'Add item', addAdmin: 'Add admin', userActivityLogs: 'User activity logs', exports: 'Exports & cards', designStudio: 'Design Studio', appCardSettings: 'App & Card Settings',
    loginTitle: 'Sign in', loginSubtitle: 'Enter your card number or ID with your password.', loginTrouble: 'Trouble signing in?',
    loginEncryptError: 'Unable to encrypt the sign-in request. Use HTTPS or disable encryption in development.', loginInvalid: 'Invalid sign-in details',
    loginServerError: 'Could not reach the server. Please try again.', loginDevHint: 'Development: login encryption disabled.',
    loginCardFromQr: 'Card number from QR', loginCardOrId: 'Card number / ID',
    loginQrHint: 'Your card number was filled from the QR code. Enter your password only.', passwordLabel: 'Password',
    showPassword: 'Show password', hidePassword: 'Hide password', verifying: 'Verifying...', signIn: 'Sign in', welcomeBack: 'Welcome back'
  }
};

export type TranslationKey = CopyKey;
export const DEFAULT_COPY = copy;
export const TRANSLATION_KEYS = Object.keys(copy.ar) as CopyKey[];

const rtlCache = createCache({ key: 'rg-rtl', stylisPlugins: [prefixer, rtlPlugin] });
const ltrCache = createCache({ key: 'rg-ltr', stylisPlugins: [prefixer] });

type UiPreferencesValue = {
  language: UiLanguage;
  mode: UiMode;
  dir: 'rtl' | 'ltr';
  setLanguage: (language: UiLanguage) => void;
  toggleLanguage: () => void;
  toggleMode: () => void;
  t: (key: CopyKey) => string;
};

const UiPreferencesContext = React.createContext<UiPreferencesValue | null>(null);

export function useUiPreferences() {
  const value = React.useContext(UiPreferencesContext);
  if (!value) throw new Error('useUiPreferences must be used inside UiPreferencesProvider');
  return value;
}

export default function UiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<UiLanguage>('ar');
  const [mode, setMode] = React.useState<UiMode>('dark');
  const [ready, setReady] = React.useState(false);
  const [overrides, setOverrides] = React.useState<Record<string, Record<string, string>>>({});

  React.useEffect(() => {
    let active = true;
    const load = (data?: Record<string, Record<string, string>>) => { if (active) setOverrides(data && typeof data === 'object' ? data : {}); };
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => load(body?.data?.uiTextOverrides))
      .catch(() => null);
    const listener = (event: Event) => load((event as CustomEvent<Record<string, Record<string, string>>>).detail);
    window.addEventListener('rg-text-updated', listener);
    return () => { active = false; window.removeEventListener('rg-text-updated', listener); };
  }, []);

  React.useEffect(() => {
    const storedLanguage = window.localStorage.getItem('rg-card-language');
    const storedMode = window.localStorage.getItem('rg-card-mode');
    const nextLanguage: UiLanguage = storedLanguage === 'en' ? 'en' : 'ar';
    // The member experience is designed dark-first; light stays one tap away.
    const nextMode: UiMode = storedMode === 'light' ? 'light' : 'dark';

    // Apply the persisted shell state before rendering the interactive tree.
    // This keeps the server markup and the first client render identical and
    // prevents hydration failures from detaching admin button handlers.
    const nextDir = nextLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextDir;
    document.documentElement.dataset.theme = nextMode;
    document.body.dir = nextDir;
    setLanguageState(nextLanguage);
    setMode(nextMode);
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.documentElement.dataset.theme = mode;
    document.documentElement.classList.toggle('rg-dir-rtl', dir === 'rtl');
    document.documentElement.classList.toggle('rg-dir-ltr', dir === 'ltr');
    document.body.dir = dir;
    document.body.classList.toggle('rg-dir-rtl', dir === 'rtl');
    document.body.classList.toggle('rg-dir-ltr', dir === 'ltr');
    window.localStorage.setItem('rg-card-language', language);
    window.localStorage.setItem('rg-card-mode', mode);
    window.dispatchEvent(new CustomEvent('rg-mode-changed', { detail: { mode } }));
  }, [language, mode, ready]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const theme = React.useMemo(() => buildMuiTheme(mode, dir), [dir, mode]);

  const value = React.useMemo<UiPreferencesValue>(() => ({
    language, mode, dir,
    setLanguage: setLanguageState,
    toggleLanguage: () => setLanguageState((current) => current === 'ar' ? 'en' : 'ar'),
    toggleMode: () => setMode((current) => current === 'light' ? 'dark' : 'light'),
    t: (key) => overrides[language]?.[key] || copy[language][key]
  }), [dir, language, mode, overrides]);

  return (
    <UiPreferencesContext.Provider value={value}>
      <CacheProvider value={dir === 'rtl' ? rtlCache : ltrCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {ready ? children : (
            <div className="rg-app-boot" role="status" aria-live="polite" aria-busy="true" aria-label="RG-Card">
              <span className="ui-loader-mark" aria-hidden="true" />
            </div>
          )}
        </ThemeProvider>
      </CacheProvider>
    </UiPreferencesContext.Provider>
  );
}
