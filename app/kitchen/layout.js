import PwaSetup from '@/components/PwaSetup';

export const metadata = {
  title: 'Kitchen',
  manifest: '/kitchen/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Kitchen' },
  icons: { apple: '/pwa-icon?size=180&app=kitchen' },
};
export const viewport = { themeColor: '#a63a0a' };

export default function KitchenLayout({ children }) {
  return (
    <>
      <PwaSetup />
      {children}
    </>
  );
}