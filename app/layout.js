import { Outfit } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = { title: 'Scan & Order' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Applies the saved light/dark choice before the page paints (no flash).
const themeInit = `try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

// Captures the browser's install prompt early, before React loads.
const capture = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e;window.dispatchEvent(new Event('pwa-ready'));});`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInit }} />
        <Script id="pwa-capture" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: capture }} />
        {children}
      </body>
    </html>
  );
}