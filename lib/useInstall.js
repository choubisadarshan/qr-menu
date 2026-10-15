'use client';
import { useEffect, useState } from 'react';

// PWA install logic shared by <InstallButton /> (kitchen / login) and the owner menu.
// Returns { installed, canInstall, install }.
// `canInstall` is true only when the browser has handed us its real install prompt,
// so the button always installs directly (no "use the browser menu" hints).
export function useInstall() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(false);

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

    return () => {
      window.removeEventListener('pwa-ready', grab);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!evt) return;
    evt.prompt();
    await evt.userChoice;
    window.__pwaPrompt = null;
    setEvt(null);
  }

  return { installed, canInstall: !!evt, install };
}
