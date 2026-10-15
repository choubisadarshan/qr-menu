import PwaSetup from '@/components/PwaSetup';
import { CONFIG } from '@/lib/config';

export const metadata = {
  title: 'Kitchen',
  manifest: '/kitchen/manifest.webmanifest',
  appleWebApp: { capable: true, title: `${CONFIG.name} Kitchen` },
  icons: {
    icon: [
      { url: '/pwa-icon?size=32&app=kitchen', sizes: '32x32', type: 'image/png' },
      { url: '/pwa-icon?size=192&app=kitchen', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/pwa-icon?size=180&app=kitchen',
  },
};

export const viewport = { themeColor: '#0f3d3e' };

export default function KitchenLayout({ children }) {
  return (
    <>
      <PwaSetup />
      {children}
    </>
  );
}
