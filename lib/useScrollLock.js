'use client';
import { useEffect } from 'react';

// Locks the page behind an open dialog/sheet so only the dialog scrolls.
// Several dialogs can be open at once: the page unlocks when the last one closes.
// (The CSS for `html.scroll-locked` is in app/globals.css.)
let locks = 0;

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    locks += 1;
    html.classList.add('scroll-locked');
    return () => {
      locks -= 1;
      if (locks <= 0) {
        locks = 0;
        html.classList.remove('scroll-locked');
      }
    };
  }, [active]);
}
