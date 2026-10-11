'use client';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'theme';
const BG = { light: '#f6f1e8', dark: '#14110f' };

function readMode() {
  try {
    const s = localStorage.getItem(KEY);
    return s === 'light' || s === 'dark' ? s : 'system';
  } catch {
    return 'system';
  }
}

// Sets data-theme on <html>, the browser colour scheme and the phone status-bar colour.
function applyMode(mode) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const t = dark ? 'dark' : 'light';
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  root.style.colorScheme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', BG[t]));
  return t;
}

export function useTheme() {
  const [theme, setTheme] = useState(null); // 'light' | 'dark' once known

  useEffect(() => {
    setTheme(applyMode(readMode()));
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      if (readMode() === 'system') setTheme(applyMode('system'));
    };
    mq.addEventListener('change', onSystem);
    return () => mq.removeEventListener('change', onSystem);
  }, []);

  const choose = useCallback((t) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    setTheme(applyMode(t));
  }, []);

  return { theme, choose };
}