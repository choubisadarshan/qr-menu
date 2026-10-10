'use client';
import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const grab = () => {
      if (window.__pwaPrompt) setEvt(window.__pwaPrompt);
    };
    grab();
    window.addEventListener('pwa-ready', grab);

    const onInstalled = () => {
      window.__pwaPrompt = null;
      setEvt(null);
      setInstalled(true);
    };
    window.addEventListener('appinstalled', onInstalled);

    let timer;
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) {
      setHint('To install: tap Share, then Add to Home Screen');
    } else if (/android/i.test(ua)) {
      timer = setTimeout(() => {
        if (!window.__pwaPrompt) {
          setHint('To install: open the browser menu (⋮), then tap Install app or Add to Home screen');
        }
      }, 3000);
    }

    return () => {
      window.removeEventListener('pwa-ready', grab);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(timer);
    };
  }, []);

  if (installed) return null;
  if (evt) {
    return (
      <button
        onClick={async () => {
          evt.prompt();
          await evt.userChoice;
          window.__pwaPrompt = null;
          setEvt(null);
        }}
        className="rounded-full bg-chip px-4 py-2 text-sm font-semibold"
      >
        Install app
      </button>
    );
  }
  if (hint) return <span className="max-w-56 text-xs text-muted">{hint}</span>;
  return null;
}