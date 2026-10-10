'use client';
import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  if (evt) {
    return (
      <button
        onClick={async () => {
          evt.prompt();
          await evt.userChoice;
          setEvt(null);
        }}
        className="rounded-full bg-chip px-4 py-2 text-sm font-semibold"
      >
        Install app
      </button>
    );
  }
  if (ios) return <span className="text-xs text-muted">To install: tap Share, then Add to Home Screen</span>;
  return null;
}