'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/config';
import OrderForm from '@/components/OrderForm';
import Dropdown from '@/components/Dropdown';
import LiveSince from '@/components/LiveSince';
import { PageHeader, StatCard, MoneyStat, StatusPill, Tabs, SearchBox, Icon } from '@/components/owner/ui';
import { tableLabel } from '@/lib/orderType';
import { clock, dateTime, formatDuration, TWELVE_HOURS } from '@/lib/time';

// Two statuses only: received (amber) and completed (green)
const STRIP = {
  received: 'border-l-warn',
  completed: 'border-l-ok',
};
const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
];
const btn = 'rounded-lg px-4 py-1.5 text-sm font-semibold';
// Card action buttons: 44px touch target on phones, compact on desktop.
const act = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold sm:min-h-9';
const EASE = 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]';

const phoneOf = (o) => {
  const c = o.order_contacts;
  return (Array.isArray(c) ? c[0]?.phone : c?.phone) || '';
};

function OrderDetails({ o }) {
  const phone = phoneOf(o);
  const created = new Date(o.created_at).getTime();
  const recent = Date.now() - created < TWELVE_HOURS;
  const done = o.status === 'completed';

  return (
    <dl className="mt-3 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
      <dt className="text-muted">Name</dt>
      <dd className="break-words font-medium">{o.customer_name}</dd>

      <dt className="text-muted">Phone</dt>
      <dd>
        {phone ? (
          <a href={`tel:${phone}`} className="font-medium tabular-nums text-accent">{phone}</a>
        ) : (
          <span className="text-muted">Not given</span>
        )}
      </dd>

      <dt className="text-muted">Placed</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{recent ? clock(o.created_at) : dateTime(o.created_at)}</span>
        {recent && !done && (
          <span className="tabular-nums text-muted">
            <LiveSince since={o.created_at} /> ago
          </span>
        )}
      </dd>

      {done && (
        <>
          <dt className="text-muted">Done</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2">
            {o.completed_at ? (
              <>
                <span className="font-medium">{recent ? clock(o.completed_at) : dateTime(o.completed_at)}</span>
                <span className="tabular-nums text-muted">
                  took {formatDuration(new Date(o.completed_at).getTime() - created)}
                </span>
              </>
            ) : (
              <span className="text-muted">Time not recorded</span>
            )}
          </dd>
        </>
      )}
    </dl>
  );
}

export default function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [range, setRange] = useState('today');
  const [filter, setFilter] = useState('all'); // all | received | completed | collected | uncollected
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | an order
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false); // phone: search field is expanded
  const [clipBar, setClipBar] = useState(false); // keeps the hidden buttons clipped while they slide away
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const clipTimer = useRef(null);

  const load = useCallback(async () => {
    let q = supabase
      .from('orders')
      .select('*, order_items(*), order_contacts(phone)')
      .order('created_at', { ascending: false });
    if (range !== 'all') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      if (range === 'week') d.setDate(d.getDate() - 6);
      q = q.gte('created_at', d.toISOString());
    }
    const { data, error: e } = await q;
    if (e) setError('Could not load orders.');
    else {
      setOrders(data);
      setError('');
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .order('name')
      .then(({ data }) => setMenu(data || []));
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel('owner-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  function openSearch() {
    clearTimeout(clipTimer.current);
    setClipBar(true);
    setSearchOpen(true);
  }
  function closeSearch() {
    setSearchOpen(false);
    clearTimeout(clipTimer.current);
    clipTimer.current = setTimeout(() => setClipBar(false), 320); // un-clip once the slide has finished
  }
  useEffect(() => () => clearTimeout(clipTimer.current), []);

  // Tapping anywhere outside the search field shrinks it back (iOS does not always blur the input on a plain tap).
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) searchInputRef.current?.blur();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [searchOpen]);

  // Updates the card straight away (so nothing flickers), then saves. `only` makes the save conditional in the database.
  async function patch(id, fields, only) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...fields } : o)));
    let q = supabase.from('orders').update(fields).eq('id', id);
    if (only) q = q.eq(only.column, only.value);
    const { error: e } = await q;
    setError(e ? 'Update failed.' : '');
    load();
  }

  // Unpaid -> Paid, one way only. The database check also refuses Paid -> Unpaid.
  function markPaid(o) {
    if (o.payment_status === 'paid') return;
    patch(o.id, { payment_status: 'paid' }, { column: 'payment_status', value: 'unpaid' });
  }

  async function remove(o) {
    if (!window.confirm(`Delete order #${o.id} (Table ${o.table_number})? This cannot be undone.`)) return;
    const { error: e } = await supabase.from('orders').delete().eq('id', o.id);
    setError(e ? 'Delete failed.' : '');
    load();
  }

  const q = search.trim().toLowerCase();
  const matches = (o) =>
    !q ||
    [o.customer_name, o.table_number, `#${o.id}`, String(o.id), tableLabel(o.table_number), ...o.order_items.map((i) => i.item_name)]
      .join(' ')
      .toLowerCase()
      .includes(q);
  const received = orders.filter((o) => o.status !== 'completed');
  const completed = orders.filter((o) => o.status === 'completed');
  const isPaid = (o) => o.payment_status === 'paid';
  const paidOrders = orders.filter(isPaid);
  const unpaidOrders = orders.filter((o) => !isPaid(o));
  const byFilter = { all: orders, received, completed, collected: paidOrders, uncollected: unpaidOrders };
  const shown = (byFilter[filter] || orders).filter(matches);
  const sum = (list) => list.reduce((a, o) => a + Number(o.total), 0);
  const collected = sum(paidOrders);
  const notCollected = sum(unpaidOrders);
  const rangeNote = range === 'today' ? 'Today' : range === 'week' ? 'Last 7 days' : 'All time';

  return (
    <section>
      <PageHeader title="Orders" subtitle="A little less busywork. A little more brewing." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr]">
        <MoneyStat
          tone="ok"
          label={`Collected · ${rangeNote}`}
          value={money(collected)}
          sub={`${paidOrders.length} paid · ${money(collected + notCollected)} total sales`}
        />
        <MoneyStat
          tone="warn"
          label="Not collected"
          value={money(notCollected)}
          sub={`${unpaidOrders.length} unpaid order${unpaidOrders.length === 1 ? '' : 's'}`}
        />
        <MoneyStat label="New orders" value={received.length} sub="Waiting to be accepted" />
        <MoneyStat label="Completed orders" value={completed.length} sub="Finished orders" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          ariaLabel="Order queue filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: orders.length },
            { value: 'received', label: 'Received', count: received.length },
            { value: 'completed', label: 'Completed', count: completed.length },
            { value: 'collected', label: 'Collected', count: paidOrders.length },
            { value: 'uncollected', label: 'Not collected', count: unpaidOrders.length },
          ]}
        />
        <div className="flex items-center gap-2 lg:ml-auto">
          {/* Phone: the search field grows while the other controls slide out of its way, then slide back. */}
          <SearchBox
            ref={searchRef}
            inputRef={searchInputRef}
            value={search}
            onChange={setSearch}
            onFocus={openSearch}
            onBlur={closeSearch}
            placeholder="Search name, table or dish"
            className={`min-w-0 flex-1 transition-shadow ${EASE} lg:w-64 lg:flex-none ${searchOpen ? 'max-md:shadow-soft' : ''}`}
          />
          <div
            className={`flex flex-none items-center gap-2 transition-[max-width,opacity,transform] ${EASE} md:max-w-none md:translate-x-0 md:opacity-100 ${
              searchOpen ? 'max-md:pointer-events-none max-md:max-w-0 max-md:translate-x-4 max-md:opacity-0' : 'max-md:max-w-80 max-md:opacity-100'
            } ${clipBar ? 'max-md:overflow-hidden' : ''}`}
            aria-hidden={searchOpen ? 'true' : undefined}
          >
            <Dropdown variant="pill" align="right" value={range} onChange={setRange} options={RANGE_OPTIONS} ariaLabel="Date range" />
            <button onClick={() => setEditing('new')} className={`${btn} flex min-h-11 flex-none items-center gap-1.5 whitespace-nowrap bg-accent text-on-accent hover:bg-accent-hover md:min-h-0`}>
              <Icon name="plus" size={16} /> New order
            </button>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line py-16 text-center text-muted">
          {q ? 'No orders match your search.' : 'No orders here yet. Time for a coffee.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {shown.map((o) => (
          <article key={o.id} className={`min-w-0 rounded-2xl border border-l-4 border-line bg-card p-4 shadow-card ${STRIP[o.status] || ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-xl font-bold">
                {tableLabel(o.table_number)} <span className="tabular-nums text-sm font-normal text-muted">#{o.id}</span>
              </div>
              <StatusPill status={o.status} />
            </div>
            <OrderDetails o={o} />

            <ul className="my-3 divide-y divide-line">
              {o.order_items.map((i) => (
                <li key={i.id} className="py-1.5">
                  <div className="flex justify-between gap-3">
                    <span><span className="tabular-nums">{i.quantity}</span> × {i.item_name}</span>
                    <span className="tabular-nums text-muted">{money(i.price * i.quantity)}</span>
                  </div>
                  {i.options_text && <div className="text-xs text-muted">{i.options_text}</div>}
                  {i.note && <div className="text-xs font-semibold text-accent">Note: {i.note}</div>}
                </li>
              ))}
            </ul>
            {o.note && <p className="mb-3 rounded-lg bg-chip p-2 text-sm text-accent">Note: {o.note}</p>}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
              <div className="mr-auto min-w-0">
                <div className="text-xl font-semibold tabular-nums">{money(o.total)}</div>
                <div className={`text-xs font-semibold ${isPaid(o) ? 'text-ok' : 'text-warn'}`}>
                  {isPaid(o) ? 'Collected' : 'Not collected'}
                </div>
              </div>
              {/* One-way switch: Unpaid -> Paid. Once Paid it is locked (disabled), same size, so nothing shifts. */}
              <button
                type="button"
                onClick={() => markPaid(o)}
                disabled={isPaid(o)}
                aria-label={isPaid(o) ? 'Paid' : 'Unpaid. Tap to mark as paid'}
                title={isPaid(o) ? 'Paid' : 'Tap to mark as paid'}
                className={`${act} w-28 flex-none border transition-colors ${
                  isPaid(o) ? 'cursor-default border-transparent bg-okbg text-ok' : 'border-warn/40 bg-warnbg text-warn active:scale-[0.98]'
                }`}
              >
                {isPaid(o) ? <Icon name="check" size={16} /> : <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warn" />}
                {isPaid(o) ? 'Paid' : 'Unpaid'}
              </button>
              {o.status !== 'completed' && (
                <button onClick={() => patch(o.id, { status: 'completed' })} className={`${act} bg-accent text-on-accent hover:bg-accent-hover max-sm:basis-full`}>
                  Mark Completed
                </button>
              )}
              <div className="flex w-full gap-2 sm:w-auto">
                <button onClick={() => setEditing(o)} className={`${act} flex-1 bg-chip sm:flex-none`}>Edit</button>
                <button onClick={() => remove(o)} className={`${act} flex-1 bg-chip text-red-600 sm:flex-none`}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <OrderForm
          order={editing === 'new' ? null : editing}
          phone={editing === 'new' ? '' : phoneOf(editing)}
          menu={menu.filter((m) => m.available)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}