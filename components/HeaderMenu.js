'use client';
import { useEffect, useRef, useState } from 'react';
import { useInstall } from '@/lib/useInstall';

/**
 * Mobile header menu: Install app, QR codes and Sign out in ONE dropdown.
 * The owner page shows this on small screens only (desktop keeps the separate buttons).
 */
export default function HeaderMenu({ onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { installed, canInstall, install } = useInstall();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function onMenuKey(e) {
    const items = [...ref.current.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(i + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(i - 1, 0)]?.focus();
    }
  }

  const item =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold outline-none hover:bg-chip focus:bg-chip';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className={`flex h-10 items-center gap-2 rounded-md bg-chip px-3 text-sm font-semibold ${open ? 'ring-2 ring-accent' : ''}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
        <span>More</span>
      </button>

      {open && (
        <div
          role="menu"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-line bg-card p-1.5 shadow-xl"
        >
          {!installed && canInstall && (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                install();
              }}
              className={item}
            >
              <span aria-hidden="true">⬇️</span> Install app
            </button>
          )}
          <a role="menuitem" href="/qr" onClick={() => setOpen(false)} className={item}>
            <span aria-hidden="true">▦</span> QR codes
          </a>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={`${item} text-red-600`}
          >
            <span aria-hidden="true">⎋</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}