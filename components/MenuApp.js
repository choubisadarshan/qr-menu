'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CONFIG, money } from '@/lib/config';
import { clock } from '@/lib/time';
import { getSession, startSession } from '@/lib/guestSession';
import ThemeToggle from '@/components/ThemeToggle';

const STEPS = ['received', 'preparing', 'ready'];
const LABEL = { received: 'Received', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' };
const NOTE = {
  received: 'The kitchen has your order and will start soon.',
  preparing: 'Your food is being prepared.',
  ready: 'Your order is ready.',
};
function Stepper({ q, name, onChange }) {
  if (!q) {
    return (
      <button
        onClick={() => onChange(1)}
        aria-label={`Add ${name}`}
        className="rounded-md bg-accent px-5 py-2 font-semibold text-on-accent"
      >
        + Add
      </button>
    );
  }
  return (
    <div className="flex items-center rounded-md bg-chip p-1">
      <button onClick={() => onChange(-1)} aria-label={`Remove one ${name}`} className="h-9 w-9 rounded-md bg-card text-xl font-semibold">
        −
      </button>
      <span className="min-w-8 text-center font-semibold">{q}</span>
      <button onClick={() => onChange(1)} aria-label={`Add one ${name}`} className="h-9 w-9 rounded-md bg-accent text-xl font-semibold text-on-accent">
        +
      </button>
    </div>
  );
}

// One dish in the menu: name, description, price, photo (or emoji) and the add button.
function Dish({ m, q, onChange }) {
  return (
    <article className="flex gap-4 border-b border-line py-4 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-lg font-semibold leading-snug">
          <span
            role="img"
            aria-label={m.is_veg ? 'Vegetarian' : 'Non-vegetarian'}
            className={`inline-grid h-4 w-4 flex-none place-items-center border-2 ${m.is_veg ? 'border-ok' : 'border-red-700'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${m.is_veg ? 'bg-ok' : 'bg-red-700'}`} />
          </span>
          {m.name}
          {m.tag && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">{m.tag}</span>
          )}
        </h3>
        <p className="mb-2 mt-1 line-clamp-2 text-sm text-muted">{m.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-lg font-semibold tabular-nums">{money(m.price)}</span>
          <Stepper q={q} name={m.name} onChange={onChange} />
        </div>
      </div>
      <div className="relative h-24 w-24 flex-none overflow-hidden rounded-lg border border-line bg-chip">
        {m.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="grid h-full w-full place-items-center text-4xl">{m.emoji}</div>
        )}
      </div>
    </article>
  );
}

function OrderCard({ o }) {
  const done = o.status === 'completed';
  const idx = STEPS.indexOf(o.status);
  const items = o.order_items || [];
  return (
    <article className="mb-3 min-w-0 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight">Table {o.table_number}</h3>
          <p className="text-sm text-muted">Placed at {clock(o.created_at)}</p>
        </div>
        <span className={`rounded-md px-3 py-1 text-xs font-semibold ${done ? 'bg-okbg text-ok' : 'bg-chip'}`}>
          {LABEL[o.status] || o.status}
        </span>
      </div>

      {!done && (
        <div className="mt-3">
          <ol className="flex gap-1.5" aria-label="Order progress">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`flex-1 border-t-4 pt-1.5 text-center text-[11px] ${
                  i <= idx ? 'border-ok font-semibold text-ok' : 'border-line text-muted'
                }`}
              >
                {LABEL[s]}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-muted">{NOTE[o.status]}</p>
        </div>
      )}

      <ul className="my-3 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 py-1.5 text-sm">
            <span>{i.quantity} × {i.item_name}</span>
            <span className="text-muted">{money(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      {o.note && <p className="mb-3 rounded-lg bg-chip p-2 text-sm text-muted">Note: {o.note}</p>}

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-lg font-semibold">{money(o.total)}</span>
        <span
          className={`rounded-md px-3 py-1 text-xs font-semibold ${
            o.payment_status === 'paid' ? 'bg-okbg text-ok' : 'bg-chip text-accent'
          }`}
        >
          {o.payment_status === 'paid' ? 'Paid' : 'Pay at counter'}
        </span>
      </div>
    </article>
  );
}

export default function MenuApp() {
  const params = useSearchParams();
  const table = (params.get('table') || '1').replace(/[^\w-]/g, '').slice(0, 6) || '1';

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState({});
  const [tab, setTab] = useState(null); // 'active' | 'completed' | null (pick automatically)
  const [ordersReady, setOrdersReady] = useState(false);

  // Which screen is showing lives in the address bar (?view=checkout / ?view=orders),
  // so the phone's Back button moves between screens instead of leaving the site.
  const rawView = params.get('view');
  const view = rawView === 'checkout' || rawView === 'orders' ? rawView : 'menu';
  const pushed = useRef(false);

  const go = useCallback(
    (v, replace = false) => {
      const qs = new URLSearchParams({ table });
      if (v !== 'menu') qs.set('view', v);
      const url = `?${qs.toString()}`;
      if (replace) {
        window.history.replaceState(null, '', url);
      } else {
        window.history.pushState(null, '', url);
        pushed.current = true;
      }
      window.scrollTo(0, 0);
    },
    [table]
  );

  const back = useCallback(() => {
    if (pushed.current) window.history.back();
    else go('menu', true);
  }, [go]);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [justPlaced, setJustPlaced] = useState(null);
  const [vegOnly, setVegOnly] = useState(false);

  // Every scan opens a fresh MENU and an empty CART. The guest's own orders for this table stay on
  // screen until they are paid and finished; after that the next scan starts a brand-new visit.
  useEffect(() => {
    let alive = true;
    try {
      localStorage.removeItem('my-orders'); // older versions kept order history in a different place
    } catch {}
    setSessionId(null);
    setCart({});
    setMyOrders([]);
    setOrdersReady(false);
    setJustPlaced(null);
    setTab(null);
    setForm((f) => ({ ...f, note: '' }));

    (async () => {
      let s = getSession(table);
      if (s) {
        try {
          const res = await fetch(`/api/orders?session=${encodeURIComponent(s.id)}`, { cache: 'no-store' });
          if (res.ok) {
            const r = await res.json();
            if (!r.open) s = null; // everything was paid and finished: start a fresh visit
          }
        } catch {
          // offline: keep the saved visit so the guest does not lose their orders
        }
      }
      if (!s) s = startSession(table);
      if (alive) setSessionId(s.id);
    })();

    return () => {
      alive = false;
    };
  }, [table]);

  // Load menu
  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('id')
      .then(({ data, error }) => {
        if (error) setLoadError('Could not load the menu. Please ask our staff.');
        else setMenu(data);
        setLoading(false);
      });
  }, []);

  // Load ONLY the orders of this visit (the server filters by session id and today)
  const loadMine = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/orders?session=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad response');
      const { orders } = await res.json();
      setMyOrders(Array.isArray(orders) ? orders : []);
    } catch {
      // keep what is on screen; the next refresh will try again
    }
    setOrdersReady(true);
  }, [sessionId]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  // Keep statuses fresh: every 5 seconds while something is unfinished or unpaid, and when the tab wakes up
  const needsPolling = myOrders.some((o) => o.status !== 'completed' || o.payment_status !== 'paid');
  useEffect(() => {
    if (!sessionId) return;
    const visible = () => document.visibilityState === 'visible';
    const poll = needsPolling ? setInterval(() => visible() && loadMine(), 5000) : null;
    const onVisible = () => visible() && loadMine();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (poll) clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionId, needsPolling, loadMine]);

  const cats = ['All', ...new Set(menu.map((m) => m.category))];
  const lines = menu.filter((m) => cart[m.id]);
  const count = lines.reduce((a, m) => a + cart[m.id], 0);
  const subtotal = lines.reduce((a, m) => a + m.price * cart[m.id], 0);
  const tax = Math.round(subtotal * CONFIG.taxRate * 100) / 100;
  const total = subtotal + tax;

  const active = myOrders.filter((o) => o.status !== 'completed');
  const completed = myOrders.filter((o) => o.status === 'completed');
  const unpaid = myOrders.filter((o) => o.payment_status !== 'paid');
  const toPay = unpaid.reduce((a, o) => a + o.total, 0);

  // Leaving the orders screen resets its banner and tab
  useEffect(() => {
    if (view !== 'orders') {
      setJustPlaced(null);
      setTab(null);
    }
  }, [view]);

  // After an order is placed, the cart is cleared once the orders screen is showing
  useEffect(() => {
    if (view === 'orders' && justPlaced) setCart({});
  }, [view, justPlaced]);

  function change(id, d) {
    setCart((c) => {
      const q = (c[id] || 0) + d;
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function placeOrder() {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) return setError('Please enter your name so we can call it out.');
    if (phone && !/^\d{10}$/.test(phone)) return setError('Phone number should be 10 digits.');
    if (!sessionId) return setError('Please wait a moment and try again.');
    setError('');
    setBusy(true);

    let res;
    try {
      res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: sessionId,
          table,
          name,
          phone,
          note: form.note.trim(),
          items: lines.map((m) => ({ id: m.id, qty: cart[m.id] })),
        }),
      });
    } catch {
      setBusy(false);
      return setError('No connection. Please check your internet and try again.');
    }
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(result.error || 'Could not send your order. Please try again.');
    }

    setForm((f) => ({ ...f, note: '' }));
    await loadMine();
    setBusy(false);
    setTab('active');
    setJustPlaced(result.order.id);
    go('orders', true); // replaces the checkout step, so Back returns to the menu
  }

  const input = 'w-full rounded-xl bg-chip p-3 outline-none focus:ring-2 focus:ring-accent';
  const panel = 'mb-4 rounded-2xl border border-line bg-card p-4';

  /* ---------- MY ORDERS (today only) ---------- */
  if (view === 'orders') {
    const tabNow = tab ?? (active.length ? 'active' : 'completed');
    const listNow = tabNow === 'active' ? active : completed;
    return (
      <main className="mx-auto max-w-md overflow-x-clip pb-32">
        <header className="bg-hero px-4 pb-6 pt-4 text-hero-ink">
          <div className="flex items-center justify-between gap-3">
            <button onClick={back} className="-ml-2 rounded-md px-2 py-2 text-sm font-semibold text-hero-ink/90">
              ← Menu
            </button>
            <ThemeToggle tone="hero" />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-hero-ink/70">Your table</p>
          <h1 className="font-display text-5xl font-semibold leading-none">Table {table}</h1>
          <p className="mt-2 text-sm text-hero-ink/80">{CONFIG.name} · today&apos;s orders</p>
        </header>

        <div className="px-4 pt-4">
          {justPlaced && (
            <div role="status" className="mb-4 border border-ok bg-okbg p-4 font-semibold text-ok">
              Order placed! The kitchen has received it.
            </div>
          )}

          {!ordersReady ? (
            <div className="space-y-3" aria-hidden="true">
              <div className="h-20 animate-pulse rounded-lg bg-chip" />
              <div className="h-40 animate-pulse rounded-lg bg-chip" />
            </div>
          ) : myOrders.length === 0 ? (
            <div className="py-14 text-center text-muted">
              <p>No orders yet today.</p>
              <p className="mt-1 text-sm">Orders you place from this table will appear here.</p>
            </div>
          ) : (
            <>
              <section className={panel}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Total to pay at counter</span>
                  <span className="text-2xl font-semibold tabular-nums text-accent">{money(toPay)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {toPay > 0
                    ? `${unpaid.length} unpaid order${unpaid.length > 1 ? 's' : ''} today. Pay at the counter when you finish.`
                    : "All of today's orders are paid. Thank you!"}
                </p>
              </section>

              <div
                role="tablist"
                aria-label="Order status"
                className="sticky top-0 z-10 -mx-4 mb-3 grid grid-cols-2 gap-2 bg-bg px-4 py-3"
              >
                {[
                  ['active', 'In progress', active.length],
                  ['completed', 'Completed', completed.length],
                ].map(([k, label, n]) => (
                  <button
                    key={k}
                    role="tab"
                    id={`tab-${k}`}
                    aria-selected={tabNow === k}
                    aria-controls="orders-panel"
                    onClick={() => setTab(k)}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold ${
                      tabNow === k ? 'border-accent bg-accent text-on-accent' : 'border-line bg-card'
                    }`}
                  >
                    {label}
                    <span className={`rounded-sm px-1.5 text-xs ${tabNow === k ? 'bg-black/15' : 'bg-chip'}`}>{n}</span>
                  </button>
                ))}
              </div>

              <div role="tabpanel" id="orders-panel" aria-labelledby={`tab-${tabNow}`}>
                {listNow.length === 0 ? (
                  <p className="rounded-lg bg-chip p-4 text-sm text-muted">
                    {tabNow === 'active' ? 'No orders in progress.' : 'No completed orders yet.'}
                  </p>
                ) : (
                  listNow.map((o) => <OrderCard key={o.id} o={o} />)
                )}
              </div>
            </>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-transparent p-4 pt-8">
          <button onClick={back} className="w-full rounded-lg bg-accent p-4 text-lg font-semibold text-on-accent">
            + Order more items
          </button>
        </div>
      </main>
    );
  }

  /* ---------- CHECKOUT ---------- */
  if (view === 'checkout' && count === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <button onClick={back} className="mt-4 rounded-md bg-accent px-5 py-3 font-semibold text-on-accent">
          Back to menu
        </button>
      </main>
    );
  }

  if (view === 'checkout') {
    return (
      <main className="mx-auto max-w-md overflow-x-clip px-4 pb-10">
        <div className="flex items-center justify-between gap-3">
          <button onClick={back} className="py-4 font-semibold text-accent">
            ← Edit cart
          </button>
          <ThemeToggle />
        </div>
        <h1 className="mb-4 flex flex-wrap items-center gap-2 text-2xl font-semibold">
          Confirm your order
          <span className="rounded-md bg-okbg px-2 py-0.5 text-xs font-semibold text-ok">Table {table}</span>
        </h1>

        <section className={panel}>
          <h2 className="mb-1 text-sm font-semibold text-muted">Your dishes ({count})</h2>
          {lines.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 border-t border-line py-3 first:border-0">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="mt-2">
                  <Stepper q={cart[m.id]} name={m.name} onChange={(d) => change(m.id, d)} />
                </div>
              </div>
              <div className="font-semibold">{money(m.price * cart[m.id])}</div>
            </div>
          ))}
        </section>

        <section className={panel}>
          <h2 className="mb-2 text-sm font-semibold text-muted">Your details</h2>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Your name</label>
          <input id="name" className={input} value={form.name} onChange={setField('name')} maxLength={40}
            autoComplete="given-name" placeholder="So we can call it out" />
          {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}

          <label htmlFor="phone" className="mb-1 mt-3 block text-sm font-medium">Phone number (optional)</label>
          <input id="phone" className={input} value={form.phone} onChange={setField('phone')} type="tel"
            inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" />

          <label htmlFor="note" className="mb-1 mt-3 block text-sm font-medium">Notes for the kitchen (optional)</label>
          <textarea id="note" className={input} rows={2} maxLength={200} value={form.note}
            onChange={setField('note')} placeholder="e.g. no onions, less spicy" />
        </section>

        <section className={panel}>
          <h2 className="mb-1 text-sm font-semibold text-muted">Payment</h2>
          <div className="font-semibold">Pay at the counter</div>
          <div className="text-sm text-muted">Order now and pay when you finish.</div>
        </section>

        <section className={panel}>
          <div className="flex justify-between text-muted"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between text-muted"><span>Tax ({Math.round(CONFIG.taxRate * 100)}%)</span><span>{money(tax)}</span></div>
          <div className="mt-2 flex justify-between border-t border-line pt-3 text-xl font-semibold">
            <span>Total due</span>
            <span className="text-accent">{money(total)}</span>
          </div>
        </section>

        <button onClick={placeOrder} disabled={busy}
          className="w-full rounded-2xl bg-accent p-4 text-lg font-semibold text-on-accent disabled:opacity-60">
          {busy ? 'Sending…' : `Send order to kitchen (${money(total)})`}
        </button>
      </main>
    );
  }

  /* ---------- MENU ---------- */
  const shown = menu.filter((m) => (cat === 'All' || m.category === cat) && (!vegOnly || m.is_veg));
  const groups = {};
  shown.forEach((m) => {
    if (!groups[m.category]) groups[m.category] = [];
    groups[m.category].push(m);
  });

  return (
    <main className="mx-auto max-w-md overflow-x-clip pb-32">
      <header className="bg-hero px-4 pb-7 pt-5 text-hero-ink">
        <div className="flex items-start justify-between gap-3">
          <p className="pt-2 text-xs font-semibold uppercase tracking-[0.25em] text-hero-ink/70">Table {table}</p>
          <div className="flex flex-none items-center gap-2">
            {myOrders.length > 0 && (
              <button
                onClick={() => go('orders')}
                className="rounded-md bg-white/15 px-3.5 py-2.5 text-sm font-semibold"
              >
                My orders
                {active.length > 0 && (
                  <span className="ml-2 rounded-sm bg-accent px-1.5 py-0.5 text-xs text-on-accent">{active.length}</span>
                )}
              </button>
            )}
            <ThemeToggle tone="hero" />
          </div>
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">{CONFIG.name}</h1>
        <div className="mt-3 flex items-center gap-2 text-hero-ink/60" aria-hidden="true">
          <span className="h-px w-10 bg-current" />
          <span className="text-xs">◆</span>
          <span className="h-px w-10 bg-current" />
        </div>
        <p className="mt-3 max-w-xs text-sm text-hero-ink/80">
          Pick your dishes, order from your seat, and pay at the counter.
        </p>
      </header>

      <div className="px-4 pt-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={c === cat}
              className={`rounded-md border px-3.5 py-1.5 text-sm font-medium ${
                c === cat ? 'border-accent bg-accent text-on-accent' : 'border-line bg-card'
              }`}
            >
              {c === 'All' ? 'All items' : c}
            </button>
          ))}
          <button
            onClick={() => setVegOnly((v) => !v)}
            aria-pressed={vegOnly}
            className={`flex items-center gap-2 rounded-md border px-3.5 py-1.5 text-sm font-medium ${
              vegOnly ? 'border-ok bg-okbg text-ok' : 'border-line bg-card text-muted'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-ok" />
            Veg only
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-5 px-4 pt-6" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded-md bg-chip" />
                <div className="h-4 w-full animate-pulse rounded-md bg-chip" />
                <div className="h-6 w-20 animate-pulse rounded-md bg-chip" />
              </div>
              <div className="h-24 w-24 animate-pulse rounded-lg bg-chip" />
            </div>
          ))}
        </div>
      )}
      {loadError && <p className="px-4 py-10 text-center text-red-600">{loadError}</p>}
      {!loading && !loadError && shown.length === 0 && (
        <p className="px-4 py-12 text-center text-muted">No dishes match this filter.</p>
      )}

      {Object.keys(groups).map((c) => (
        <section key={c} className="px-4 pt-6">
          <h2 className="flex items-center gap-3 font-display text-xl font-semibold">
            {c}
            <span className="h-px flex-1 bg-line" />
          </h2>
          {groups[c].map((m) => (
            <Dish key={m.id} m={m} q={cart[m.id]} onChange={(d) => change(m.id, d)} />
          ))}
        </section>
      ))}

      <p className="mx-4 mt-6 border border-line bg-card p-4 text-sm text-muted">
        Dietary request? Add a note for the kitchen when you confirm your order.
      </p>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
          <button
            onClick={() => go('checkout')}
            className="flex w-full items-center justify-between rounded-lg bg-bar p-3 pl-5 text-left text-white"
          >
            <span>
              <span className="block text-sm opacity-80">{count} item{count > 1 ? 's' : ''}</span>
              <span className="text-xl font-semibold">{money(subtotal)}</span>
            </span>
            <span className="rounded-md bg-accent px-5 py-3 text-lg font-semibold text-on-accent">Order now</span>
          </button>
        </div>
      )}
    </main>
  );
}