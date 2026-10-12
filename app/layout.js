import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import ThemeSync from '@/components/ThemeSync';
import { CONFIG } from '@/lib/config';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata = {
  title: { default: `${CONFIG.name} · Scan & Order`, template: `%s · ${CONFIG.name}` },
  description: `Scan the QR code, order from your table and pay at the counter at ${CONFIG.name}.`,
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f4ee',
  colorScheme: 'light dark',
};

// Runs before the page paints: applies the saved light/dark choice (or the phone's setting).
const themeInit = `try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t}catch(e){}`;

// Captures the browser's install prompt early, before React loads.
const capture = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e;window.dispatchEvent(new Event('pwa-ready'));});`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: capture }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}