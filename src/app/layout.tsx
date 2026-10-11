import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import './globals.css';
import '../styles/ui.css';

export const metadata: Metadata = {
  title: { default: 'RG-Card', template: '%s · RG-Card' },
  description: 'RG-Card — عضوية الامتيازات والخصومات الحصرية',
  applicationName: 'RG-Card',
  appleWebApp: { capable: true, title: 'RG-Card', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'RG-Card',
    description: 'عضوية الامتيازات والخصومات الحصرية',
    images: [{ url: '/brand/rg-icon-512.png', width: 512, height: 512 }],
    locale: 'ar_EG',
    type: 'website'
  },
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: '#08090c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
