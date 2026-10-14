'use client';
import { useEffect, useRef, useState } from 'react';
import { money } from '@/lib/config';
import { normalizeOptions, defaultSelection, priceFor, describe } from '@/lib/options';
import { VegMark, BackArrow, priceDelta } from '@/components/customer/shared';

// The bottom sheet for customizable dishes (pizza size and crust, pasta shape...).
// Step 1 picks a variety (only if the dish has one), step 2 picks size / crust / notes / quantity.
export default function Customizer({ item, line, vegOnly, onClose, onConfirm }) {
  const opts = normalizeOptions(item.options);
  const groups = opts?.groups ?? [];
  const stepOne = groups[0]?.layout === 'cards' ? groups[0] : null;
  const rest = stepOne ? groups.slice(1) : groups;

  const [shown, setShown] = useState(false);
  const [step, setStep] = useState(stepOne && !line ? 1 : 2);
  const [sel, setSel] = useState(() => line?.sel ?? defaultSelection(opts, vegOnly));
  const [qty, setQty] = useState(line?.qty ?? 1);
  const [note, setNote] = useState(line?.note ?? '');
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setShown(true);
      sheetRef.current?.focus();
    });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, []);

  function close() {
    setShown(false);
    setTimeout(onClose, 300);
  }

  const unit = priceFor(item.price, opts, sel);
  const total = unit * qty;
  const varieties = stepOne ? stepOne.choices.filter((c) => !(vegOnly && c.diet === 'non-veg')) : [];
  const current = stepOne ? stepOne.choices.find((c) => c.id === sel[stepOne.key]) : null;
  const title = opts?.title || `Customize ${item.name}`;

  function goStep(n) {
    setStep(n);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function confirm() {
    if (step === 1) return goStep(2);
    onConfirm({
      id: item.id,
      name: item.name,
      qty,
      sel,
      note: note.trim(),
      unit,
      optionsText: describe(opts, sel),
      custom: true,
    });
    close();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
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
              {stepOne ? (step === 1 ? 'Step 1 of 2: Select Variety' : 'Step 2 of 2: Your Options') : 'Customize your order'}
            </span>
            <h2 id="sheet-title" className="font-display text-lg font-bold leading-tight">
              {step === 1 ? title : line ? 'Edit your item' : title}
            </h2>
          </div>
          <button onClick={close} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-chip transition active:scale-90">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={scrollRef} className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {step === 1 && stepOne && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted">Select one signature recipe to customize:</p>
              <div className="space-y-2.5">
                {varieties.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSel((s) => ({ ...s, [stepOne.key]: c.id }));
                      goStep(2);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-tile border border-line bg-bg p-3 text-left transition hover:border-accent active:scale-[0.98]"
                  >
                    <div className="flex flex-1 items-start gap-2.5">
                      {c.icon && <span className="mt-0.5 flex-none select-none text-2xl" aria-hidden="true">{c.icon}</span>}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <VegMark veg={c.diet !== 'non-veg'} small />
                          <span className="font-display text-sm font-bold">{c.name}</span>
                        </div>
                        {c.desc && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{c.desc}</p>}
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="text-xs font-bold tabular-nums">{money(item.price + c.price)}</div>
                      <span className="mt-1 inline-block text-[10px] font-semibold text-accent">Select →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              {stepOne && (
                <button onClick={() => goStep(1)} className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent/10">
                  <BackArrow />
                  <span>{current?.name ?? 'Change variety'}</span>
                </button>
              )}

              {rest.map((g) => (
                <div key={g.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">{g.label}</span>
                    <span className="text-[11px] text-muted">{g.required ? 'Required' : 'Optional'}</span>
                  </div>

                  {g.layout === 'grid' ? (
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, g.choices.length)}, minmax(0, 1fr))` }}>
                      {g.choices.map((c) => {
                        const on = sel[g.key] === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSel((s) => ({ ...s, [g.key]: c.id }))}
                            aria-pressed={on}
                            className={`rounded-tile border p-2.5 text-left transition ${on ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-line bg-bg'}`}
                          >
                            <div className="text-xs font-bold">{c.name}</div>
                            {c.sub && <div className="my-0.5 text-[10px] leading-tight text-muted">{c.sub}</div>}
                            <div className="mt-1 text-[11px] font-bold tabular-nums text-accent">
                              {money(priceFor(item.price, opts, { ...sel, [g.key]: c.id }))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {g.choices.map((c) => {
                        const on = sel[g.key] === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSel((s) => ({ ...s, [g.key]: c.id }))}
                            aria-pressed={on}
                            className={`flex items-center justify-between rounded-tile border p-2.5 text-left transition ${on ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-line bg-bg'}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${on ? 'border-accent bg-accent' : 'border-muted'}`}>
                                {on && <span className="h-1.5 w-1.5 rounded-full bg-on-accent" />}
                              </span>
                              <span className="text-xs font-semibold">{c.name}</span>
                            </span>
                            <span className="text-xs font-medium text-muted">{priceDelta(c.price, money)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-1.5">
                <label htmlFor="chef-note" className="text-xs font-bold uppercase tracking-wider">Special Request for Chef</label>
                <input
                  id="chef-note"
                  type="text"
                  value={note}
                  maxLength={120}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Less spicy, crispy base, no onions"
                  className="w-full rounded-tile border border-line bg-bg p-2.5 text-xs outline-none placeholder:text-muted/70 focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs font-bold">Quantity</span>
                <div className="flex items-center gap-3 rounded-tile border border-line bg-bg p-1">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="h-7 w-7 rounded-btn bg-chip text-sm font-bold transition active:scale-95">−</button>
                  <span className="w-5 text-center text-xs font-bold tabular-nums" aria-live="polite">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity" className="h-7 w-7 rounded-btn bg-chip text-sm font-bold transition active:scale-95">+</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="safe-bottom flex items-center justify-between gap-3 border-t border-line bg-card p-4">
          <div className="pl-1">
            <span className="block text-[11px] font-medium text-muted">{step === 1 ? 'Starting from' : 'Total Price'}</span>
            <span className="font-sans text-lg font-bold tabular-nums">{money(step === 1 ? item.price : total)}</span>
          </div>
          <button
            onClick={confirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-tile bg-accent px-5 py-3 text-xs font-bold text-on-accent shadow-md transition hover:bg-accent-hover active:scale-[0.98]"
          >
            <span>{step === 1 ? 'Continue to Options' : line ? 'Update Item' : 'Add to Order'}</span>
            {step === 2 && (
              <>
                <span className="opacity-75">•</span>
                <span className="tabular-nums">{money(total)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}