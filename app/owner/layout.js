import PwaSetup from '@/components/PwaSetup';

export const metadata = {
  title: 'Owner',
  manifest: '/owner/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Owner' },
  icons: { apple: '/pwa-icon?size=180&app=owner' },
};
export const viewport = { themeColor: '#1d1b19' };

export default function OwnerLayout({ children }) {
  return (
    <>
      <PwaSetup />
      {children}
    </>
  );
}