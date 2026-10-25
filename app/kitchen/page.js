'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStaff, signOut } from '@/lib/useStaff';
import KitchenShell from '@/components/kitchen/KitchenShell';
import RangePicker from '@/components/kitchen/RangePicker';
import { initialRange, rangeBounds, rangeWord } from '@/lib/dateRange';
import { PageHeader, SearchBox, Icon, ViewToggle, Pager } from '@/components/owner/ui';
import { KitchenCard, KitchenList, HistoryList, HistoryGrid } from '@/components/kitchen/OrderViews';
import { usePaged, readView, saveView } from '@/lib/usePaged';

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

export default function KitchenPage() {
  const router = useRouter();
  const { loading, email } = useStaff(['kitchen', 'owner'], '/kitchen/login');
  const [orders, setOrders] = useState([]); // everything placed in the chosen range
  const [range, setRange] = useState(initialRange);
  const [tab, setTab] = useState('Kitchen'); // 'Kitchen' | 'Order history'
  const [search, setSearch] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const [kitchenView, setKitchenView] = useState(() => readView('kitchen-view', 'grid'));
  const [historyView, setHistoryView] = useState(() => readView('kitchen-history-view', 'list'));
  const audio = useRef(null);
  const soundRef = useRef(false);

  const { key: rKey, from: rFrom, to: rTo } = range;
  const load = useCallback(async () => {
    const { gte, lt } = rangeBounds({ key: rKey, from: rFrom, to: rTo });
    let q = supabase.from('orders').select('*, order_items(*)').gte('created_at', gte);
    if (lt) q = q.lt('created_at', lt);
    const { data } = await q.order('created_at');
    setOrders(data || []);
  }, [rKey, rFrom, rTo]);

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
    return () => {
      supabase.removeChannel(ch);
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

  // 20 orders per page, so a long list never slows the screen down. Going back to page 1 on any search / date change.
  const resetKey = `${q}|${rKey}|${rFrom}|${rTo}`;
  const activePg = usePaged(activeShown, `a|${resetKey}`);
  const donePg = usePaged(doneShown, `d|${resetKey}`);

  if (loading) return <p className="p-10 text-center text-muted">Loading…</p>;

  const isKitchen = tab === 'Kitchen';
  const pg = isKitchen ? activePg : donePg;
  const view = isKitchen ? kitchenView : historyView;
  const chooseView = (v) => {
    if (isKitchen) {
      setKitchenView(v);
      saveView('kitchen-view', v);
    } else {
      setHistoryView(v);
      saveView('kitchen-history-view', v);
    }
  };

  return (
    <KitchenShell tab={tab} setTab={setTab} badge={range.key === 'today' ? active.length : 0} email={email} onSignOut={() => signOut(router, '/kitchen/login')}>
      <PageHeader
        title={isKitchen ? 'Kitchen' : 'Order history'}
        subtitle={isKitchen ? 'A little care in every order. Let’s get cooking.' : `A look back at every order served ${rangeWord(range)}.`}
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
        <Stat icon="orders" tone="plain" label="Total orders" value={orders.length} sub={`Placed ${rangeWord(range)}`} />
        <Stat icon="bell" tone="warn" label="New orders" value={active.length} sub="Waiting to be completed" />
        <Stat icon="check" tone="ok" label="Completed orders" value={done.length} sub={`Finished ${rangeWord(range)}`} />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by order, table or item" className="w-full sm:max-w-sm sm:flex-1" />
        <RangePicker value={range} onChange={setRange} />
      </div>

      {pg.total > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted">
            {pg.total} order{pg.total === 1 ? '' : 's'}
          </span>
          <ViewToggle value={view} onChange={chooseView} />
        </div>
      )}

      {pg.total === 0 && (
        <p className="rounded-2xl border border-dashed border-edge py-16 text-center text-muted">
          {q
            ? 'No orders match your search.'
            : isKitchen
              ? 'No active orders. New orders appear here instantly.'
              : `No completed orders ${rangeWord(range)}.`}
        </p>
      )}

      {pg.total > 0 &&
        (isKitchen ? (
          view === 'list' ? (
            <KitchenList orders={activePg.slice} onComplete={(id) => setStatus(id, 'completed')} />
          ) : (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activePg.slice.map((o) => (
                <KitchenCard key={o.id} order={o} onComplete={(id) => setStatus(id, 'completed')} />
              ))}
            </section>
          )
        ) : view === 'list' ? (
          <HistoryList orders={donePg.slice} />
        ) : (
          <HistoryGrid orders={donePg.slice} />
        ))}

      <Pager pg={pg} />
    </KitchenShell>
  );
}