'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/config';
import OrderForm from '@/components/OrderForm';
import Dropdown from '@/components/Dropdown';
import LiveSince from '@/components/LiveSince';
import { PageHeader, MoneyStat, StatusPill, Tabs, SearchBox, Icon } from '@/components/owner/ui';
import { isTakeaway, tableLabel } from '@/lib/orderType';
import { clock, dateTime, formatDuration, TWELVE_HOURS } from '@/lib/time';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
];
const btn = 'rounded-lg px-4 py-1.5 text-sm font-semibold';
// Card action buttons: 44px touch target on phones, compact on desktop.
const act = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold sm:min-h-9';
// List rows: compact on phones (36px), original sizes from sm up.
const listAct = 'inline-flex h-9 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold sm:min-h-9 sm:h-auto sm:gap-1.5 sm:px-4 sm:text-sm';
const listIconBtn = 'grid h-9 w-9 flex-none place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink';
const iconBtn = 'grid h-11 w-11 flex-none place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink sm:h-9 sm:w-9';
const EASE = 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]';

const isRecent = (iso) => Date.now() - new Date(iso).getTime() < TWELVE_HOURS;

const phoneOf = (o) => {
  const c = o.order_contacts;
  return (Array.isArray(c) ? c[0]?.phone : c?.phone) || '';
};

export default function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [range, setRange] = useState('today');
  const [filter, setFilter] = useState('all'); // all | received | completed
  const [search, setSearch] = useState('');
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('owner-orders-view') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
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
  const filterOptions = [
    { value: 'all', label: 'All', count: orders.length },
    { value: 'received', label: 'Received', count: received.length },
    { value: 'completed', label: 'Completed', count: completed.length },
    { value: 'collected', label: 'Collected', count: paidOrders.length },
    { value: 'uncollected', label: 'Not collected', count: unpaidOrders.length },
  ];
  const chooseView = (v) => {
    setView(v);
    try {
      localStorage.setItem('owner-orders-view', v);
    } catch {}
  };
  // Grid / list switch. Desktop: in the toolbar. Phones: on its own row above the orders (never inside a scrolling row).
  const viewToggle = (cls) => (
    <div role="group" aria-label="Card layout" className={`${cls} flex-none items-center gap-0.5 rounded-lg border border-edge bg-card p-0.5`}>
      {[
        ['grid', 'Grid view'],
        ['list', 'List view'],
      ].map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => chooseView(v)}
          aria-pressed={view === v}
          aria-label={label}
          title={label}
          className={`grid h-9 w-9 place-items-center rounded-md transition-colors ${view === v ? 'bg-accent text-on-accent' : 'text-muted hover:bg-chip hover:text-ink'}`}
        >
          <Icon name={v} size={16} />
        </button>
      ))}
    </div>
  );
  const rangeNote = range === 'today' ? 'Today' : range === 'week' ? 'Last 7 days' : 'All time';

  return (
    <section>
      <PageHeader title="Orders" subtitle="A little less busywork. A little more brewing." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="mb-5 flex flex-col gap-4">
        {/* Phones and tablets: chips that scroll sideways. Desktop uses the dropdown in the row below. */}
        <div className="lg:hidden">
          <Tabs ariaLabel="Order queue filter" value={filter} onChange={setFilter} options={filterOptions} />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden flex-none lg:block">
            <Dropdown variant="pill" align="left" value={filter} onChange={setFilter} options={filterOptions} ariaLabel="Order filter" />
          </div>
          {/* Phone: the search field grows while the other controls slide out of its way, then slide back. */}
          <SearchBox
            ref={searchRef}
            inputRef={searchInputRef}
            value={search}
            onChange={setSearch}
            onFocus={openSearch}
            onBlur={closeSearch}
            placeholder="Search name, table or dish"
            className={`min-w-0 flex-1 transition-shadow ${EASE} ${searchOpen ? 'max-md:shadow-soft' : ''}`}
          />
          <div
            className={`flex flex-none items-center gap-2 transition-[max-width,opacity] ${EASE} md:max-w-none md:opacity-100 ${
              searchOpen ? 'max-md:pointer-events-none max-md:max-w-0 max-md:opacity-0' : 'max-md:max-w-80 max-md:opacity-100'
            } ${clipBar ? 'max-md:overflow-hidden' : ''}`}
            aria-hidden={searchOpen ? 'true' : undefined}
          >
            <Dropdown variant="pill" align="right" value={range} onChange={setRange} options={RANGE_OPTIONS} ariaLabel="Date range" />
            {viewToggle('hidden md:flex')}
            <button onClick={() => setEditing('new')} className={`${btn} flex h-10 flex-none items-center gap-1.5 whitespace-nowrap bg-accent py-0 text-on-accent hover:bg-accent-hover`}>
              <Icon name="plus" size={16} /> New order
            </button>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-edge py-16 text-center text-muted">
          {q ? 'No orders match your search.' : 'No orders here yet. Time for a coffee.'}
        </p>
      )}

      {shown.length > 0 && (
        <div className="mb-3 flex items-center justify-between md:hidden">
          <span className="text-sm text-muted">
            {shown.length} order{shown.length === 1 ? '' : 's'}
          </span>
          {viewToggle('flex')}
        </div>
      )}

      {view === 'list' ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-edge bg-card shadow-card">
          {shown.map((o) => {
            const phone = phoneOf(o);
            const created = new Date(o.created_at).getTime();
            const recent = isRecent(o.created_at);
            const done = o.status === 'completed';
            const takeaway = isTakeaway(o.table_number);
            const summary = o.order_items.map((i) => `${i.quantity}× ${i.item_name}`).join(', ');
            return (
              <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-3 py-2.5 sm:gap-x-3 sm:px-4 sm:py-3 md:flex md:flex-wrap md:gap-x-4 md:gap-y-3 xl:grid xl:grid-cols-[minmax(13rem,1.3fr)_minmax(0,1.2fr)_7rem_6rem_22rem]">
                <div className="flex min-w-0 items-center gap-2.5 max-md:col-start-1 max-md:row-start-1 md:gap-3 md:flex-1 md:basis-56">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-accent text-on-accent md:h-11 md:w-11 md:rounded-xl">
                    <div className="text-center leading-none">
                      <div className="text-[8px] font-semibold uppercase tracking-wider opacity-80">{takeaway ? 'Take' : 'Table'}</div>
                      <div className={`mt-0.5 font-bold ${takeaway ? 'text-[11px] md:text-xs' : 'text-base md:text-lg'}`}>{takeaway ? 'away' : o.table_number}</div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold leading-tight md:text-base">Order #{o.id}</div>
                    <div className="truncate text-[11px] leading-snug text-muted md:text-xs">
                      {o.customer_name} · {recent ? clock(o.created_at) : dateTime(o.created_at)}
                      {done && o.completed_at && ` · Done ${recent ? clock(o.completed_at) : dateTime(o.completed_at)}`}
                      {phone && ` · ${phone}`}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 text-[13px] leading-snug max-md:col-span-2 max-md:row-start-2 md:text-sm md:flex-[2] md:basis-60">
                  <p className="truncate" title={summary}>{summary}</p>
                  {o.note && <p className="truncate text-[11px] text-accent md:text-xs">Note: {o.note}</p>}
                </div>

                <span className={`inline-flex flex-none items-center gap-1.5 justify-self-end rounded-full max-md:col-start-2 max-md:row-start-1 xl:justify-self-start px-2 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${done ? 'bg-okbg text-ok' : 'bg-warnbg text-warn'}`}>
                  <Icon name={done ? 'check' : 'clock'} size={13} className="max-sm:hidden" />
                  {done ? 'Completed' : 'Received'}
                </span>

                <div className="min-w-0 text-left max-md:col-start-1 max-md:row-start-3 md:w-24 md:flex-none md:text-right xl:w-auto">
                  <div className="font-bold leading-tight tabular-nums">{money(o.total)}</div>
                  <div className={`text-[11px] font-semibold leading-tight md:text-xs ${isPaid(o) ? 'text-ok' : 'text-muted'}`}>{isPaid(o) ? 'Collected' : 'Not collected'}</div>
                </div>

                <div className="flex flex-none items-center justify-self-end gap-0.5 sm:gap-1 max-md:col-start-2 max-md:row-start-3 md:ml-auto xl:ml-0 xl:justify-end">
                  {!done && (
                    <button type="button" onClick={() => patch(o.id, { status: 'completed' })} title="Mark completed" aria-label="Mark completed" className={`${listAct} border border-accent text-accent hover:bg-okbg max-sm:w-9 max-sm:px-0`}>
                      <Icon name="check" size={16} /> <span className="max-sm:hidden">Complete</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => markPaid(o)}
                    disabled={isPaid(o)}
                    aria-label={isPaid(o) ? 'Paid' : 'Unpaid. Tap to mark as paid'}
                    className={`${listAct} min-w-[4.5rem] flex-none px-3 transition-colors sm:w-28 sm:px-2 ${isPaid(o) ? 'cursor-default bg-okbg text-ok' : 'bg-accent text-on-accent hover:bg-accent-hover active:scale-[0.98]'}`}
                  >
                    {isPaid(o) && <Icon name="check" size={16} />}
                    {isPaid(o) ? 'Paid' : 'Mark paid'}
                  </button>
                  <button type="button" onClick={() => setEditing(o)} aria-label={`Edit order ${o.id}`} title="Edit" className={listIconBtn}>
                    <Icon name="edit" size={18} />
                  </button>
                  <button type="button" onClick={() => remove(o)} aria-label={`Delete order ${o.id}`} title="Delete" className={`${listIconBtn} hover:text-red-600`}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {shown.map((o) => {
          const phone = phoneOf(o);
          const created = new Date(o.created_at).getTime();
          const recent = isRecent(o.created_at);
          const done = o.status === 'completed';
          const takeaway = isTakeaway(o.table_number);
          return (
            <article key={o.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-edge bg-card shadow-card">
              {/* Header: table badge, order number + customer, status */}
              <div className="flex items-center gap-3 bg-chip/50 px-4 py-3.5">
                <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-accent text-on-accent">
                  <div className="text-center leading-none">
                    <div className="text-[9px] font-semibold uppercase tracking-wider opacity-80">{takeaway ? 'Take' : 'Table'}</div>
                    <div className={`mt-0.5 font-bold ${takeaway ? 'text-sm' : 'text-xl'}`}>{takeaway ? 'away' : o.table_number}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">Order #{o.id}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted">
                    <Icon name="user" size={13} />
                    <span className="truncate">{o.customer_name}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${done ? 'bg-okbg text-ok' : 'bg-warnbg text-warn'}`}
                >
                  <Icon name={done ? 'check' : 'clock'} size={13} />
                  {done ? 'Completed' : 'Received'}
                </span>
              </div>

              {/* Times + phone */}
              <div className="space-y-1.5 border-t border-line px-4 py-3 text-xs text-muted">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5">
                    <Icon name="clock" size={13} /> Placed{' '}
                    <b className="font-semibold text-ink">{recent ? clock(o.created_at) : dateTime(o.created_at)}</b>
                    {recent && !done && (
                      <span className="tabular-nums">
                        · <LiveSince since={o.created_at} /> ago
                      </span>
                    )}
                  </span>
                  <span>
                    Done{' '}
                    {done && o.completed_at ? (
                      <>
                        <b className="font-semibold text-ink">{recent ? clock(o.completed_at) : dateTime(o.completed_at)}</b>
                        <span className="tabular-nums text-ok"> · {formatDuration(new Date(o.completed_at).getTime() - created)}</span>
                      </>
                    ) : (
                      <b className="font-semibold text-ink">—</b>
                    )}
                  </span>
                </div>
                {phone && (
                  <a href={`tel:${phone}`} className="flex w-fit items-center gap-1.5 tabular-nums hover:text-accent">
                    <Icon name="phone" size={13} /> {phone}
                  </a>
                )}
              </div>

              {/* Items */}
              <ul className="flex-1 space-y-2.5 border-t border-line px-4 py-3.5">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-none rounded-md bg-chip px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted">{i.quantity}×</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <span className="min-w-0 break-words font-medium">{i.item_name}</span>
                        <span className="flex-none font-semibold tabular-nums">{money(i.price * i.quantity)}</span>
                      </div>
                      {i.options_text && <div className="text-xs text-muted">{i.options_text}</div>}
                      {i.note && <div className="text-xs font-semibold text-accent">Note: {i.note}</div>}
                    </div>
                  </li>
                ))}
                {o.note && <li className="rounded-lg bg-chip p-2 text-sm text-accent">Note: {o.note}</li>}
              </ul>

              {/* Footer: total + actions */}
              <div className="flex flex-wrap items-center gap-x-1 gap-y-3 border-t border-line px-4 py-3.5">
                <div className="mr-auto min-w-0 pr-2">
                  <div className="text-xl font-bold tabular-nums">{money(o.total)}</div>
                  <div className={`text-xs font-semibold ${isPaid(o) ? 'text-ok' : 'text-muted'}`}>{isPaid(o) ? 'Collected' : 'Not collected'}</div>
                </div>
                {/* One-way switch: Unpaid -> Paid. Once Paid it is locked (disabled), same size, so nothing shifts. */}
                <button
                  type="button"
                  onClick={() => markPaid(o)}
                  disabled={isPaid(o)}
                  aria-label={isPaid(o) ? 'Paid' : 'Unpaid. Tap to mark as paid'}
                  className={`${act} w-28 flex-none transition-colors ${
                    isPaid(o) ? 'cursor-default bg-okbg text-ok' : 'bg-accent text-on-accent hover:bg-accent-hover active:scale-[0.98]'
                  }`}
                >
                  {isPaid(o) && <Icon name="check" size={16} />}
                  {isPaid(o) ? 'Paid' : 'Mark paid'}
                </button>
                <button type="button" onClick={() => setEditing(o)} aria-label={`Edit order ${o.id}`} title="Edit" className={iconBtn}>
                  <Icon name="edit" size={18} />
                </button>
                <button type="button" onClick={() => remove(o)} aria-label={`Delete order ${o.id}`} title="Delete" className={`${iconBtn} hover:text-red-600`}>
                  <Icon name="trash" size={18} />
                </button>
                {!done && (
                  <button
                    type="button"
                    onClick={() => patch(o.id, { status: 'completed' })}
                    className={`${act} basis-full border border-accent text-accent hover:bg-okbg`}
                  >
                    <Icon name="check" size={16} /> Mark Completed
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      )}

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