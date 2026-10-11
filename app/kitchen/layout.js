import PwaSetup from '@/components/PwaSetup';
import { CONFIG } from '@/lib/config';

export const metadata = {
  title: 'Kitchen',
  manifest: '/kitchen/manifest.webmanifest',
  appleWebApp: { capable: true, title: `${CONFIG.name} Kitchen` },
  icons: { apple: '/pwa-icon?size=180&app=kitchen' },
};

export default function KitchenLayout({ children }) {
  return (
    <>
      <PwaSetup />
      {children}
    </>
  );
}