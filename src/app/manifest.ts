import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RG-Card',
    short_name: 'RG-Card',
    description: 'عضوية الامتيازات والخصومات الحصرية',
    start_url: '/valid',
    display: 'standalone',
    background_color: '#08090c',
    theme_color: '#08090c',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/brand/rg-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/rg-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ]
  };
}
