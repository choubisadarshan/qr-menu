'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CONFIG, money } from '@/lib/config';
import { clock } from '@/lib/time';
import ThemeToggle from '@/components/ThemeToggle';

const STEPS = ['received', 'preparing', 'ready'];
const LABEL = { received: 'Received', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' };
const NOTE = {
  received: 'The kitchen has your order and will start soon.',
  preparing: 'Your food is being prepared.',
  ready: 'Your order is ready.',
};
const STORE = 'my-orders';
const KEEP_MS = 12 * 60 * 60 * 1000; // orders stay on this screen for 12 hours

// The order numbers placed from this phone are remembered in the browser.
function readOrders() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE) || '[]');
    const cutoff = Date.now() - KEEP_MS;
    return Array.isArray(list) ? list.filter((x) => x && x.id && x.t > cutoff) : [];
  } catch {
    return [];
  }
}
function rememberOrder(id) {
  try {
    const list = [...readOrders(), { id, t: Date.now() }].slice(-30);
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {}
}

function Stepper({ q, name, onChange }) {
  if (!q) {
    return (
      <button
        onClick={() => onChange(1)}
        aria-label={`Add ${name}`}
        className="rounded-full bg-accent px-5 py-2 font-semibold text-white"
      >
        + Add
      </button>
    );
  }
  return (
    <div className="flex items-center rounded-full bg-chip p-1">
      <button onClick={() => onChange(-1)} aria-label={`Remove one ${name}`} className="h-9 w-9 rounded-full bg-card text-xl font-semibold">
        −
      </button>
      <span className="min-w-8 text-center font-semibold">{q}</span>
      <button onClick={() => onChange(1)} aria-label={`Add one ${name}`} className="h-9 w-9 rounded-full bg-accent text-xl font-semibold text-white">
        +
      </button>
    </div>
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
          <h3 className="text-lg font-semibold">Order #{o.id}</h3>
          <p className="text-sm text-muted">Placed at {clock(o.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${done ? 'bg-okbg text-ok' : 'bg-chip'}`}>
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
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
  const [view, setView] = useState('menu'); // menu | checkout | orders
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [justPlaced, setJustPlaced] = useState(null);

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

  // Load every order placed from this phone (with its items and status)
  const loadMine = useCallback(async () => {
    const ids = readOrders().map((x) => x.id);
    if (!ids.length) {
      setMyOrders([]);
      return;
    }
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('id', ids)
      .order('created_at', { ascending: false });
    setMyOrders(data || []);
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  // Keep statuses live: realtime updates + a refresh every 30s and when the tab wakes up
  const idKey = myOrders.map((o) => o.id).join(',');
  useEffect(() => {
    if (!idKey) return;
    const ch = supabase
      .channel('my-orders-' + idKey)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=in.(${idKey})` },
        loadMine
      )
      .subscribe();
    const poll = setInterval(loadMine, 30000);
    const onVisible = () => document.visibilityState === 'visible' && loadMine();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [idKey, loadMine]);

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

  useEffect(() => {
    if (view === 'checkout' && count === 0) setView('menu');
  }, [view, count]);

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
    setError('');
    setBusy(true);

    const { data, error: e1 } = await supabase
      .from('orders')
      .insert({
        table_number: table,
        customer_name: name,
        note: form.note.trim() || null,
        subtotal,
        tax,
        total,
      })
      .select()
      .single();
    if (e1) {
      setBusy(false);
      return setError('Could not send your order. Please try again.');
    }

    const { error: e2 } = await supabase.from('order_items').insert(
      lines.map((m) => ({
        order_id: data.id,
        item_name: m.name,
        price: m.price,
        quantity: cart[m.id],
      }))
    );
    if (e2) {
      setBusy(false);
      return setError('Order saved but items failed. Please tell our staff.');
    }
    if (phone) await supabase.from('order_contacts').insert({ order_id: data.id, phone });

    rememberOrder(data.id);
    setCart({});
    setForm((f) => ({ ...f, note: '' }));
    await loadMine();
    setBusy(false);
    setJustPlaced(data.id);
    setView('orders');
    window.scrollTo(0, 0);
  }

  const input = 'w-full rounded-xl bg-chip p-3 outline-none focus:ring-2 focus:ring-accent';
  const panel = 'mb-4 rounded-2xl border border-line bg-card p-4';
  const sectionTitle = 'mb-2 mt-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted';

  /* ---------- MY ORDERS ---------- */
  if (view === 'orders') {
    return (
      <main className="mx-auto max-w-md px-4 pb-32">
        <header className="flex items-center justify-between gap-3 py-4">
          <div>
            <h1 className="text-2xl font-semibold">Your orders</h1>
            <p className="text-sm text-muted">Table {table} · {CONFIG.name}</p>
          </div>
          <ThemeToggle />
        </header>

        {justPlaced && (
          <div role="status" className="mb-4 rounded-2xl bg-okbg p-4 font-semibold text-ok">
            Order #{justPlaced} placed! The kitchen has received it.
          </div>
        )}

        {myOrders.length === 0 ? (
          <div className="py-16 text-center text-muted">
            <div className="text-5xl" aria-hidden="true">🍽️</div>
            <p className="mt-3">You haven't placed an order yet.</p>
          </div>
        ) : (
          <>
            <section className={panel}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Total to pay at counter</span>
                <span className="text-2xl font-semibold text-accent">{money(toPay)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {toPay > 0
                  ? `Across ${unpaid.length} order${unpaid.length > 1 ? 's' : ''}. Pay at the counter when you finish.`
                  : 'All your orders are paid. Thank you!'}
              </p>
            </section>

            <h2 className={sectionTitle}>
              In progress <span className="rounded-full bg-chip px-2 py-0.5 text-xs">{active.length}</span>
            </h2>
            {active.length === 0 ? (
              <p className="mb-3 rounded-2xl bg-chip p-4 text-sm text-muted">No orders in progress.</p>
            ) : (
              active.map((o) => <OrderCard key={o.id} o={o} />)
            )}

            <h2 className={sectionTitle}>
              Completed <span className="rounded-full bg-chip px-2 py-0.5 text-xs">{completed.length}</span>
            </h2>
            {completed.length === 0 ? (
              <p className="mb-3 rounded-2xl bg-chip p-4 text-sm text-muted">No completed orders yet.</p>
            ) : (
              completed.map((o) => <OrderCard key={o.id} o={o} />)
            )}
          </>
        )}

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-transparent p-4 pt-8">
          <button
            onClick={() => {
              setJustPlaced(null);
              setView('menu');
              window.scrollTo(0, 0);
            }}
            className="w-full rounded-2xl bg-accent p-4 text-lg font-semibold text-white"
          >
            + Order more items
          </button>
        </div>
      </main>
    );
  }

  /* ---------- CHECKOUT ---------- */
  if (view === 'checkout') {
    return (
      <main className="mx-auto max-w-md px-4 pb-10">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setView('menu')} className="py-4 font-semibold text-accent">
            ← Edit cart
          </button>
          <ThemeToggle />
        </div>
        <h1 className="mb-4 flex flex-wrap items-center gap-2 text-2xl font-semibold">
          Confirm your order
          <span className="rounded-full bg-okbg px-2 py-0.5 text-xs font-semibold text-ok">Table {table}</span>
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
          className="w-full rounded-2xl bg-accent p-4 text-lg font-semibold text-white disabled:opacity-60">
          {busy ? 'Sending…' : `Send order to kitchen (${money(total)})`}
        </button>
      </main>
    );
  }

  /* ---------- MENU ---------- */
  const list = menu.filter((m) => cat === 'All' || m.category === cat);
  return (
    <main className="mx-auto max-w-md px-4 pb-32">
      <header className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {CONFIG.name}
            <span className="rounded-full bg-okbg px-2 py-0.5 text-xs font-semibold text-ok">Table {table}</span>
          </h1>
          <p className="text-sm text-muted">Menu</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          {myOrders.length > 0 && (
            <button
              onClick={() => {
                setJustPlaced(null);
                setView('orders');
              }}
              className="rounded-full bg-chip px-4 py-2.5 text-sm font-semibold"
            >
              My orders
              {active.length > 0 && (
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-white">{active.length}</span>
              )}
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <section className="mb-4 rounded-2xl bg-chip p-4">
        <h2 className="text-xl font-semibold">Scan, tap dishes &amp; enjoy.</h2>
        <p className="mt-1 text-sm text-muted">
          Tap + to add items. Your order reaches the kitchen as soon as you place it.
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-3" role="group" aria-label="Categories">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={c === cat}
            className={`whitespace-nowrap rounded-full px-4 py-2 font-medium ${c === cat ? 'bg-accent text-white' : 'bg-chip'}`}>
            {c === 'All' ? 'All items' : c}
          </button>
        ))}
      </div>

      {loading && <p className="py-10 text-center text-muted">Loading menu…</p>}
      {loadError && <p className="py-10 text-center text-red-600">{loadError}</p>}

      {list.map((m) => (
        <article key={m.id} className="mb-3 flex gap-3 rounded-2xl border border-line bg-card p-3.5">
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              <span title={m.is_veg ? 'Veg' : 'Non-veg'}
                className={`h-2.5 w-2.5 rounded-full ${m.is_veg ? 'bg-ok' : 'bg-red-700'}`} />
              {m.name}
              {m.tag && (
                <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-muted">{m.tag}</span>
              )}
            </h3>
            <p className="mb-2 mt-1 line-clamp-2 text-sm text-muted">{m.description}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-xl font-semibold text-accent">{money(m.price)}</span>
              <Stepper q={cart[m.id]} name={m.name} onChange={(d) => change(m.id, d)} />
            </div>
          </div>
          <div aria-hidden="true" className="grid h-24 w-24 flex-none place-items-center rounded-xl bg-chip text-5xl">
            {m.emoji}
          </div>
        </article>
      ))}

      <p className="mt-2 rounded-xl bg-chip p-4 text-sm text-muted">
        Dietary request? Add a note for the kitchen when you confirm your order.
      </p>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
          <button onClick={() => setView('checkout')}
            className="flex w-full items-center justify-between rounded-2xl bg-bar p-3 pl-5 text-left text-white">
            <span>
              <span className="block text-sm opacity-80">{count} item{count > 1 ? 's' : ''}</span>
              <span className="text-xl font-semibold">{money(subtotal)}</span>
            </span>
            <span className="rounded-xl bg-accent px-5 py-3 text-lg font-semibold">Order now</span>
          </button>
        </div>
      )}
    </main>
  );
}