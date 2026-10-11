import PwaSetup from '@/components/PwaSetup';
import { CONFIG } from '@/lib/config';

export const metadata = {
  title: 'Owner',
  manifest: '/owner/manifest.webmanifest',
  appleWebApp: { capable: true, title: `${CONFIG.name} Owner` },
  icons: { apple: '/pwa-icon?size=180&app=owner' },
};

export default function OwnerLayout({ children }) {
  return (
    <>
      <PwaSetup />
      {children}
    </>
  );
}