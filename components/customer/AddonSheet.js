'use client';
import { useEffect, useRef, useState } from 'react';
import { CONFIG, money } from '@/lib/config';
import { useScrollLock } from '@/lib/useScrollLock';
import { cartTotals } from '@/lib/cart';
import { VegMark, Thumb } from '@/components/customer/shared';

// Popup opened from an order card: the add-ons that go with the dish the guest ordered.
// Sending creates a NEW small order for the same table, so the kitchen sees it and it joins the bill.
export default function AddonSheet({ dishName, addons, defaultName, onClose, onOrder }) {
  useScrollLock(true);
  const [shown, setShown] = useState(false);
  const [qty, setQty] = useState({});
  const [name, setName] = useState(defaultName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sheetRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setShown(true);
      sheetRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function close() {
    setShown(false);
    setTimeout(onClose, 300);
  }

  const bump = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(20, (q[id] || 0) + d)) }));
  const picked = addons.filter((a) => (qty[a.id] || 0) > 0);
  const totals = cartTotals(
    picked.map((a) => ({ unit: Number(a.price), qty: qty[a.id] })),
    CONFIG.taxRate
  );

  async function send() {
    if (picked.length === 0) return setError('Pick at least one item.');
    setBusy(true);
    setError('');
    const err = await onOrder(
      picked.map((a) => ({ id: a.id, qty: qty[a.id] })),
      name
    );
    setBusy(false);
    if (err) return setError(err);
    close();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="addon-title">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className={`sheet-transition relative z-10 mx-auto flex max-h-[88vh] w-full max-w-[440px] flex-col rounded-t-hero border-t border-line bg-card shadow-sheet outline-none ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex w-full justify-center pb-1 pt-3" aria-hidden="true">
          <div className="h-1.5 w-12 rounded-full bg-line" />
        </div>

        <div className="flex items-center justify-between border-b border-line px-5 pb-3 pt-2">
          <div className="min-w-0">
            <span className="mb-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Add more to your meal
            </span>
            <h2 id="addon-title" className="font-display text-lg font-bold leading-tight">
              Want more with your {dishName}?
            </h2>
          </div>
          <button onClick={close} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-chip transition active:scale-90">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {addons.map((a) => {
            const n = qty[a.id] || 0;
            return (
              <div key={a.id} className={`flex items-center gap-3 rounded-tile border p-2.5 transition ${n > 0 ? 'border-accent bg-accent/5' : 'border-line bg-bg'}`}>
                <Thumb m={a} className="h-11 w-11 text-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <VegMark veg={a.is_veg} small />
                    <span className="truncate font-display text-sm font-bold">{a.name}</span>
                  </div>
                  <div className="text-xs font-semibold tabular-nums text-muted">{Number(a.price) > 0 ? money(a.price) : 'Free'}</div>
                </div>
                {n === 0 ? (
                  <button
                    onClick={() => bump(a.id, 1)}
                    aria-label={`Add ${a.name}`}
                    className="rounded-btn bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent transition active:scale-95 hover:bg-accent-hover"
                  >
                    + Add
                  </button>
                ) : (
                  <div className="flex flex-none items-center gap-1 rounded-full bg-chip p-0.5">
                    <button onClick={() => bump(a.id, -1)} aria-label={`Less ${a.name}`} className="h-7 w-7 rounded-full text-base font-bold transition active:scale-90">
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums" aria-live="polite">{n}</span>
                    <button onClick={() => bump(a.id, 1)} aria-label={`More ${a.name}`} className="h-7 w-7 rounded-full text-base font-bold transition active:scale-90">
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {!defaultName && (
            <div className="pt-2">
              <label htmlFor="addon-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Your name
              </label>
              <input
                id="addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="given-name"
                placeholder="So we can call it out"
                className="w-full rounded-tile border border-line bg-bg p-3 text-base outline-none focus:border-accent"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-line px-5 pb-5 pt-3">
          <button
            onClick={send}
            disabled={busy || picked.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-accent p-3.5 text-sm font-bold text-on-accent shadow-md transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Sending…' : picked.length === 0 ? 'Pick what you need' : `Send to kitchen · ${money(totals.total)}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">Added to your table’s bill. Pay everything at the counter.</p>
        </div>
      </div>
    </div>
  );
}