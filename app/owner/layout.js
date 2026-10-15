import PwaSetup from '@/components/PwaSetup';
import { CONFIG } from '@/lib/config';

// Linking the manifest + registering the service worker is what makes the browser offer a real
// one-tap "Install app" (instead of a plain shortcut) and use the café icon, not the site favicon.
export const metadata = {
  title: { default: `Owner Dashboard · ${CONFIG.name}`, template: `%s · ${CONFIG.name}` },
  description: `Owner workspace for ${CONFIG.name}.`,
  manifest: '/owner/manifest.webmanifest',
  appleWebApp: { capable: true, title: `${CONFIG.name} Owner` },
  icons: {
    icon: [
      { url: '/pwa-icon?size=32&app=owner', sizes: '32x32', type: 'image/png' },
      { url: '/pwa-icon?size=192&app=owner', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/pwa-icon?size=180&app=owner',
  },
};

export const viewport = { themeColor: '#1B5E3B' };

export default function OwnerLayout({ children }) {
  return (
    <>
      <PwaSetup />
      {children}
    </>
  );
}
