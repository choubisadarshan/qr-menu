'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStaff, signOut } from '@/lib/useStaff';
import { money } from '@/lib/config';
import { clock, dateTime } from '@/lib/time';
import { tableLabel } from '@/lib/orderType';
import KitchenShell from '@/components/kitchen/KitchenShell';
import { PageHeader, SearchBox, StatusPill, Icon } from '@/components/owner/ui';

const STRIP = {
  received: 'border-l-warn',
};

// Two statuses only: Received -> Completed
const NEXT = {
  received: ['completed', 'Mark completed'],
};

// Stat card with an icon tile (design reference). Three of them sit side by side, even on phones.
const TONES = {
  ok: 'bg-okbg text-ok',
  warn: 'bg-warnbg text-warn',
  plain: 'bg-chip text-ink',
};
function Stat({ icon, tone, label, value, sub }) {
  const [first, ...rest] = label.split(' '); // phones show just the first word ("Total", "New", "Completed")
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-edge bg-card p-3 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <span className={`hidden h-11 w-11 flex-none place-items-center rounded-xl sm:grid ${TONES[tone]}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="text-xs text-muted sm:text-sm">
          {first}
          <span className="hidden sm:inline"> {rest.join(' ')}</span>
        </div>
        <div className="mt-0.5 font-sans text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
        <div className="mt-0.5 hidden truncate text-xs text-muted sm:block">{sub}</div>
      </div>
    </div>
  );
}

const itemCount = (o) => o.order_items.reduce((a, i) => a + Number(i.quantity || 0), 0);

export default function KitchenPage() {
  const router = useRouter();
  const { loading, email } = useStaff(['kitchen', 'owner'], '/kitchen/login');
  const [orders, setOrders] = useState([]); // everything placed today
  const [tab, setTab] = useState('Kitchen'); // 'Kitchen' | 'Order history'
  const [search, setSearch] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState(0);
  const audio = useRef(null);
  const soundRef = useRef(false);

  const load = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .gte('created_at', start.toISOString())
      .order('created_at');
    setOrders(data || []);
  }, []);

  // Keep the tablet screen awake
  useEffect(() => {
    let lock;
    const get = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
      } catch {}
    };
    get();
    const onVis = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.();
    };
  }, []);

  // Live orders + sound
  useEffect(() => {
    if (loading) return;
    load();
    setNow(Date.now());
    const beep = () => {
      const c = audio.current;
      if (!c || !soundRef.current) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
      o.start();
      o.stop(c.currentTime + 0.7);
    };
    const ch = supabase
      .channel('kitchen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        beep();
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, load)
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(tick);
    };
  }, [loading, load]);

  function toggleSound() {
    if (!audio.current) audio.current = new (window.AudioContext || window.webkitAudioContext)(); // needs a tap first
    soundRef.current = !soundRef.current;
    setSoundOn(soundRef.current);
  }

  async function setStatus(id, status) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from('orders').update({ status }).eq('id', id);
    load();
  }

  const q = search.trim().toLowerCase();
  const matches = useCallback(
    (o) =>
      !q ||
      [o.customer_name, o.table_number, `#${o.id}`, String(o.id), ...o.order_items.map((i) => i.item_name)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    [q]
  );

  const active = useMemo(() => orders.filter((o) => o.status !== 'completed'), [orders]);
  const done = useMemo(() => orders.filter((o) => o.status === 'completed'), [orders]);
  const activeShown = active.filter(matches); // oldest first, so the longest-waiting order is on top
  const doneShown = done.filter(matches).reverse(); // newest first

  if (loading) return <p className="p-10 text-center text-muted">Loading…</p>;

  const isKitchen = tab === 'Kitchen';

  return (
    <KitchenShell tab={tab} setTab={setTab} badge={active.length} email={email} onSignOut={() => signOut(router, '/kitchen/login')}>
      <PageHeader
        title={isKitchen ? 'Kitchen' : 'Order history'}
        subtitle={isKitchen ? 'A little care in every order. Let’s get cooking.' : 'A look back at every order served today.'}
      >
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          className={`flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-card ${soundOn ? 'border-ok/30 bg-okbg text-ok' : 'border-edge bg-card hover:bg-chip'}`}
        >
          <Icon name={soundOn ? 'volume' : 'volumeOff'} size={16} />
          {soundOn ? 'Sound on' : 'Enable sound'}
        </button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon="orders" tone="plain" label="Total orders" value={orders.length} sub="Placed today" />
        <Stat icon="bell" tone="warn" label="New orders" value={active.length} sub="Waiting to be completed" />
        <Stat icon="check" tone="ok" label="Completed orders" value={done.length} sub="Finished today" />
      </div>

      <SearchBox value={search} onChange={setSearch} placeholder="Search by order, table or item" className="mb-5 sm:max-w-sm" />

      {isKitchen ? (
        <>
          {activeShown.length === 0 && (
            <p className="rounded-2xl border border-dashed border-edge py-16 text-center text-muted">
              {q ? 'No orders match your search.' : 'No active orders. New orders appear here instantly.'}
            </p>
          )}

          {/* Order cards keep the same sizes as before (big table number, large item text, large button). */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeShown.map((o) => {
              const next = NEXT[o.status];
              const mins = Math.max(0, Math.round((now - new Date(o.created_at).getTime()) / 60000));
              return (
                <article key={o.id} className={`min-w-0 rounded-2xl border border-l-4 border-edge bg-card p-4 shadow-card ${STRIP[o.status] || ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-3xl font-bold">{tableLabel(o.table_number)}</div>
                      <div className="break-words text-sm text-muted">
                        #{o.id} · {o.customer_name}
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <span className="rounded-md bg-chip px-3 py-1 text-xs font-semibold capitalize">{o.status}</span>
                      <div className={`mt-1 text-sm font-semibold ${mins >= 15 ? 'text-accent' : 'text-muted'}`}>
                        {mins} min
                      </div>
                    </div>
                  </div>

                  <ul className="my-3 divide-y divide-line text-lg">
                    {o.order_items.map((i) => (
                      <li key={i.id} className="py-2">
                        <b>{i.quantity} ×</b> {i.item_name}
                        {i.options_text && <div className="text-sm text-muted">{i.options_text}</div>}
                        {i.note && <div className="text-sm font-semibold text-accent">Note: {i.note}</div>}
                      </li>
                    ))}
                  </ul>

                  {o.note && (
                    <p className="mb-3 rounded-lg bg-chip p-2 text-sm font-semibold text-accent">Note: {o.note}</p>
                  )}

                  <p className="mb-3 text-sm text-muted">
                    {o.payment_status === 'paid' ? 'Paid at counter' : 'Not paid yet'}
                  </p>

                  {next && (
                    <button
                      onClick={() => setStatus(o.id, next[0])}
                      className="w-full rounded-xl bg-accent p-3.5 text-lg font-semibold text-on-accent hover:bg-accent-hover"
                    >
                      {next[1]}
                    </button>
                  )}
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <>
          {doneShown.length === 0 && (
            <p className="rounded-2xl border border-dashed border-edge py-16 text-center text-muted">
              {q ? 'No orders match your search.' : 'No completed orders yet today.'}
            </p>
          )}

          {doneShown.length > 0 && (
            <>
              {/* Tablet / desktop: table */}
              <div className="hidden overflow-hidden rounded-2xl border border-edge bg-card shadow-card md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-chip text-xs uppercase tracking-wide text-muted">
                    <tr>
                      {['Order', 'Table', 'Date & time', 'Items', 'Total', 'Status'].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {doneShown.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-3.5 font-bold">#{o.id}</td>
                        <td className="px-4 py-3.5">{tableLabel(o.table_number)}</td>
                        <td className="px-4 py-3.5 tabular-nums">{dateTime(o.created_at)}</td>
                        <td className="px-4 py-3.5 tabular-nums">{itemCount(o)}</td>
                        <td className="px-4 py-3.5 tabular-nums">{money(o.total)}</td>
                        <td className="px-4 py-3.5"><StatusPill status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones: one card per order */}
              <ul className="space-y-3 md:hidden">
                {doneShown.map((o) => (
                  <li key={o.id} className="rounded-2xl border border-l-4 border-edge border-l-ok bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-bold">{tableLabel(o.table_number)} <span className="text-sm font-normal text-muted">#{o.id}</span></div>
                        <div className="text-sm text-muted">{clock(o.created_at)} · {itemCount(o)} item{itemCount(o) === 1 ? '' : 's'}</div>
                      </div>
                      <StatusPill status={o.status} />
                    </div>
                    <div className="mt-2 text-base font-semibold tabular-nums">{money(o.total)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </KitchenShell>
  );
}
