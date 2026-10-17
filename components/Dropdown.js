'use client';
import { useEffect, useRef, useState } from 'react';

const VARIANT = {
  pill: 'inline-flex min-w-36 items-center justify-between gap-2 rounded-lg border border-edge bg-card px-4 py-2 text-sm font-semibold hover:bg-chip',
  field: 'flex w-full items-center justify-between gap-2 rounded-xl border border-edge bg-card p-3 text-left hover:bg-chip',
};

function Chevron({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`flex-none text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Custom dropdown (replaces the plain <select>).
 * options: [{ value, label, dot?, count? }]   dot = a Tailwind bg class, e.g. "bg-ok"; count = small number badge
 * variant: 'pill' (small, for cards) | 'field' (full width, for forms)
 * align:   'left' | 'right'  (which edge the menu lines up with)
 */
export default function Dropdown({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Select…',
  variant = 'field',
  align = 'left',
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const current = options.find((o) => o.value === value);

  function openMenu() {
    const r = btnRef.current.getBoundingClientRect();
    // Use the visible page width (not window.innerWidth, which can be wider on phones) so the menu is never cut off
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const minW = Math.min(Math.max(r.width, 176), vw - 16);
    const below = vh - r.bottom;
    const up = below < 220 && r.top > below;
    const s = { minWidth: minW, maxWidth: vw - 16, maxHeight: Math.max(120, (up ? r.top : below) - 16) };
    // Line up with the chosen edge of the button, then keep the whole menu on screen
    const wanted = align === 'right' ? r.right - minW : r.left;
    s.left = Math.max(8, Math.min(wanted, vw - minW - 8));
    if (up) s.bottom = vh - r.top + 6;
    else s.top = r.bottom + 6;
    setStyle(s);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        btnRef.current?.focus();
      }
    };
    const onScroll = (e) => {
      if (!menuRef.current?.contains(e.target)) close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    const first =
      menuRef.current?.querySelector('[aria-selected="true"]') || menuRef.current?.querySelector('[role="option"]');
    first?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function pick(v) {
    setOpen(false);
    btnRef.current?.focus();
    if (v !== value) onChange(v);
  }

  function onMenuKey(e) {
    const items = [...menuRef.current.querySelectorAll('[role="option"]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(i + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(i - 1, 0)]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (!open && e.key === 'ArrowDown') {
            e.preventDefault();
            openMenu();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}: ${current ? current.label : placeholder}` : undefined}
        className={`${VARIANT[variant]} ${open ? 'ring-2 ring-accent' : ''}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {current?.dot && <span className={`h-2.5 w-2.5 flex-none rounded-full ${current.dot}`} />}
          <span className={`truncate ${current ? '' : 'text-muted'}`}>{current ? current.label : placeholder}</span>
          {current?.count != null && <span className="flex-none rounded-full bg-chip px-1.5 text-xs tabular-nums text-muted">{current.count}</span>}
        </span>
        <Chevron open={open} />
      </button>

      {open && style && (
        <div
          ref={menuRef}
          role="listbox"
          onKeyDown={onMenuKey}
          style={style}
          className="fixed z-50 overflow-y-auto rounded-2xl border border-edge bg-card p-1.5 shadow-xl"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(o.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none hover:bg-chip focus:bg-chip ${
                  selected ? 'font-semibold text-accent' : ''
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {o.dot && <span className={`h-2.5 w-2.5 flex-none rounded-full ${o.dot}`} />}
                  <span className="truncate">{o.label}</span>
                </span>
                {o.count != null && <span className="ml-auto flex-none rounded-full bg-chip px-1.5 text-xs font-semibold tabular-nums text-muted">{o.count}</span>}
                {selected && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}