import { Outfit } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = { title: 'Scan & Order' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Captures the browser's install prompt early, before React loads.
const capture = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e;window.dispatchEvent(new Event('pwa-ready'));});`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script id="pwa-capture" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: capture }} />
        {children}
      </body>
    </html>
  );
}