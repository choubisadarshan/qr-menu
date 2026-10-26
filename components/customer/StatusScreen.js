'use client';
import { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { CONFIG, money } from '@/lib/config';
import { clock } from '@/lib/time';
import { BackArrow, CheckIcon } from '@/components/customer/shared';
import { addonsForOrder } from '@/lib/addons';
import AddonSheet from '@/components/customer/AddonSheet';

// Only two statuses are used: Received (the kitchen has it) and Completed.
const LABEL = { received: 'Received', completed: 'Completed' };

function OrderCard({ o, hint, onHint }) {
  const done = o.status === 'completed';
  const items = o.order_items || [];
  return (
    <article className="mb-3 min-w-0 rounded-card border border-line bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl font-bold leading-tight">Table {o.table_number}</h3>
          <p className="text-sm text-muted">Placed at {clock(o.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${done ? 'bg-okbg text-ok' : 'bg-accent/10 text-accent'}`}>
          {LABEL[o.status] || o.status}
        </span>
      </div>

      <div className="mt-3" aria-label="Order progress">
        <ol className="flex gap-1.5">
          <li className="flex-1 border-t-4 border-ok pt-1.5 text-center text-[11px] font-semibold text-ok">Received</li>
          <li className={`flex-1 border-t-4 pt-1.5 text-center text-[11px] ${done ? 'border-ok font-semibold text-ok' : 'border-line text-muted'}`}>Completed</li>
        </ol>
        <p className="mt-2 text-sm text-muted">
          {done ? 'Your order is completed. Enjoy!' : 'The kitchen has your order and is working on it.'}
        </p>
      </div>

      <ul className="my-3 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="py-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{i.quantity} × {i.item_name}</span>
              <span className="text-muted tabular-nums">{money(i.price * i.quantity)}</span>
            </div>
            {i.options_text && <div className="text-xs text-muted">{i.options_text}</div>}
            {i.note && <div className="text-xs italic text-accent">Note: {i.note}</div>}
          </li>
        ))}
      </ul>
      {o.note && <p className="mb-3 rounded-tile bg-chip p-2 text-sm text-muted">Note: {o.note}</p>}

      {hint && (
        <button
          type="button"
          onClick={() => onHint(o)}
          className="mb-3 flex w-full items-center gap-3 rounded-tile border border-dashed border-accent/50 bg-accent/5 p-3 text-left transition active:scale-[0.99]"
        >
          <span className="flex-none select-none text-2xl" aria-hidden="true">{hint.addons[0].emoji || '🍽️'}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Want more with your {hint.dishName}?</span>
            <span className="block truncate text-xs text-muted">
              {hint.addons.slice(0, 3).map((a) => a.name).join(' · ')}
              {hint.addons.length > 3 ? ` +${hint.addons.length - 3} more` : ''}
            </span>
          </span>
          <span className="flex-none rounded-full bg-accent px-3 py-1 text-xs font-bold text-on-accent">+ Add</span>
        </button>
      )}

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="font-sans text-lg font-bold tabular-nums">{money(o.total)}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${o.payment_status === 'paid' ? 'bg-okbg text-ok' : 'bg-chip text-accent'}`}>
          {o.payment_status === 'paid' ? 'Paid' : 'Pay at counter'}
        </span>
      </div>
    </article>
  );
}

// Screen 3 (final): the placed order(s) with their status and what to pay at the counter.
export default function StatusScreen({
  table,
  orders,
  ready,
  justPlaced,
  tab,
  setTab,
  onBack,
  menu = [],
  defaultName = '',
  onOrderExtras,
}) {
  const [hintFor, setHintFor] = useState(null); // the order whose "add more" popup is open
  const active = orders.filter((o) => o.status !== 'completed');
  const completed = orders.filter((o) => o.status === 'completed');
  const unpaid = orders.filter((o) => o.payment_status !== 'paid');
  const toPay = unpaid.reduce((a, o) => a + o.total, 0);
  const tabNow = tab ?? (active.length ? 'active' : 'completed');
  const list = tabNow === 'active' ? active : completed;

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
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] opacity-75">Your table</p>
          <h1 className="font-display text-5xl font-semibold leading-none">Table {table}</h1>
          <p className="mt-2 text-sm opacity-80">{CONFIG.name} · today&apos;s orders</p>
        </div>
      </header>

      <main className="px-4 pt-4">
        {justPlaced && (
          <div role="status" className="mb-4 flex items-center gap-3 rounded-card border border-ok bg-okbg p-4 font-semibold text-ok">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ok text-on-ok"><CheckIcon size={14} /></span>
            Order placed! The kitchen has received it.
          </div>
        )}

        {!ready ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-20 animate-pulse rounded-card bg-chip" />
            <div className="h-40 animate-pulse rounded-card bg-chip" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-14 text-center text-muted">
            <p>No orders yet today.</p>
            <p className="mt-1 text-sm">Orders you place from this table will appear here.</p>
          </div>
        ) : (
          <>
            <section className="mb-4 rounded-card border border-line bg-card p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Total to pay at counter</span>
                <span className="font-sans text-2xl font-bold tabular-nums text-accent">{money(toPay)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {toPay > 0
                  ? `${unpaid.length} unpaid order${unpaid.length > 1 ? 's' : ''} today. Pay at the counter when you finish.`
                  : "All of today's orders are paid. Thank you!"}
              </p>
            </section>

            <div role="tablist" aria-label="Order status" className="sticky top-0 z-10 -mx-4 mb-3 grid grid-cols-2 gap-2 bg-bg px-4 py-3">
              {[
                ['active', 'Received', active.length],
                ['completed', 'Completed', completed.length],
              ].map(([k, label, n]) => (
                <button
                  key={k}
                  role="tab"
                  id={`tab-${k}`}
                  aria-selected={tabNow === k}
                  aria-controls="orders-panel"
                  onClick={() => setTab(k)}
                  className={`flex items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-semibold transition ${
                    tabNow === k ? 'border-accent bg-accent text-on-accent shadow-sm' : 'border-line bg-card'
                  }`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 text-xs ${tabNow === k ? 'bg-black/15' : 'bg-chip'}`}>{n}</span>
                </button>
              ))}
            </div>

            <div role="tabpanel" id="orders-panel" aria-labelledby={`tab-${tabNow}`}>
              {list.length === 0 ? (
                <p className="rounded-card bg-chip p-4 text-sm text-muted">
                  {tabNow === 'active' ? 'No orders waiting right now.' : 'No completed orders yet.'}
                </p>
              ) : (
                list.map((o) => <OrderCard key={o.id} o={o} hint={addonsForOrder(o, menu)} onHint={setHintFor} />)
              )}
            </div>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-4 pt-8">
        <button onClick={onBack} className="w-full rounded-card bg-accent p-4 text-sm font-bold text-on-accent shadow-xl transition hover:bg-accent-hover active:scale-[0.98]">
          + Order more items
        </button>
      </div>

      {hintFor && addonsForOrder(hintFor, menu) && (
        <AddonSheet
          key={hintFor.id}
          dishName={addonsForOrder(hintFor, menu).dishName}
          addons={addonsForOrder(hintFor, menu).addons}
          defaultName={defaultName}
          onClose={() => setHintFor(null)}
          onOrder={onOrderExtras}
        />
      )}
    </div>
  );
}