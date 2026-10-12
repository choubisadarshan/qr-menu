'use client';
import ThemeToggle from '@/components/ThemeToggle';
import { CONFIG, money } from '@/lib/config';
import { BackArrow, Ornament } from '@/components/customer/shared';

const field =
  'w-full rounded-tile border border-line bg-card p-3 text-sm outline-none placeholder:text-muted/70 focus:border-accent focus:ring-1 focus:ring-accent';

// Screen 2: the basket. The guest edits quantities, changes or removes items, adds their details, then places the order.
export default function BasketScreen({
  table,
  lines,
  totals,
  form,
  setForm,
  error,
  busy,
  onQty,
  onRemove,
  onEdit,
  onBack,
  onPlace,
}) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-bg pb-32 shadow-xl">
      <header className="rounded-b-hero bg-hero px-5 pb-6 pt-4 text-hero-ink shadow-md">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold transition hover:bg-white/10">
            <BackArrow /> Menu
          </button>
          <ThemeToggle tone="hero" />
        </div>
        <div className="pt-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-75">Table {table} · {CONFIG.name}</p>
          <h1 className="font-display text-3xl font-medium">Your basket</h1>
          <Ornament className="mt-2" />
        </div>
      </header>

      {lines.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="text-5xl" aria-hidden="true">🧺</div>
          <p className="mt-3 font-display text-lg font-bold">Your basket is empty</p>
          <p className="mt-1 text-sm text-muted">Pick something tasty from the menu.</p>
          <button onClick={onBack} className="mt-5 rounded-tile bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition hover:bg-accent-hover active:scale-95">
            Browse menu
          </button>
        </div>
      ) : (
        <main className="space-y-4 px-4 pt-5">
          <section aria-label="Items in your basket" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Items ({totals.count})</h2>
            {lines.map((l) => (
              <article key={l.key} className="rounded-card border border-line bg-card p-3.5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[15px] font-bold leading-snug">{l.name}</h3>
                    {l.optionsText && <p className="mt-0.5 text-xs text-muted">{l.optionsText}</p>}
                    {l.note && <p className="mt-0.5 text-xs italic text-accent">Note: {l.note}</p>}
                  </div>
                  <div className="flex-none text-sm font-bold tabular-nums">{money(l.unit * l.qty)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-tile border border-line bg-bg p-1">
                    <button onClick={() => onQty(l.key, -1)} aria-label={`Remove one ${l.name}`} className="h-8 w-8 rounded-btn bg-chip text-base font-bold transition active:scale-95">
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">{l.qty}</span>
                    <button onClick={() => onQty(l.key, 1)} aria-label={`Add one ${l.name}`} className="h-8 w-8 rounded-btn bg-accent text-base font-bold text-on-accent transition active:scale-95">
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    {l.custom && (
                      <button onClick={() => onEdit(l)} className="text-accent hover:underline">
                        Edit
                      </button>
                    )}
                    <button onClick={() => onRemove(l.key)} aria-label={`Remove ${l.name} from basket`} className="text-nonveg hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section aria-label="Your details" className="space-y-3 rounded-card border border-line bg-card p-4 shadow-card">
            <h2 className="font-display text-lg font-bold">Your details</h2>
            <div>
              <label htmlFor="b-name" className="mb-1 block text-xs font-semibold">Your name</label>
              <input id="b-name" className={field} value={form.name} onChange={set('name')} maxLength={40} autoComplete="given-name" placeholder="So we can call it out" />
              {error && <p role="alert" className="mt-1.5 text-xs font-medium text-nonveg">{error}</p>}
            </div>
            <div>
              <label htmlFor="b-phone" className="mb-1 block text-xs font-semibold">Phone number (optional)</label>
              <input id="b-phone" className={field} value={form.phone} onChange={set('phone')} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" />
            </div>
            <div>
              <label htmlFor="b-note" className="mb-1 block text-xs font-semibold">Notes for the kitchen (optional)</label>
              <textarea id="b-note" className={field} rows={2} maxLength={200} value={form.note} onChange={set('note')} placeholder="e.g. no onions, water with ice" />
            </div>
          </section>

          <section aria-label="Bill" className="rounded-card border border-line bg-card p-4 shadow-card">
            <div className="flex justify-between text-sm text-muted"><span>Subtotal</span><span className="tabular-nums">{money(totals.subtotal)}</span></div>
            <div className="mt-1 flex justify-between text-sm text-muted"><span>Tax ({Math.round(CONFIG.taxRate * 100)}%)</span><span className="tabular-nums">{money(totals.tax)}</span></div>
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-display text-lg font-bold">Total due</span>
              <span className="font-display text-xl font-bold tabular-nums text-accent">{money(totals.total)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">Pay at the counter when you finish. No payment is taken here.</p>
          </section>
        </main>
      )}

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-4 pt-6">
          <button
            onClick={onPlace}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-accent p-4 text-sm font-bold text-on-accent shadow-xl transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? 'Sending to the kitchen…' : <>Place order <span className="opacity-75">•</span> <span className="tabular-nums">{money(totals.total)}</span></>}
          </button>
        </div>
      )}
    </div>
  );
}