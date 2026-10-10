'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/config';
import OrderForm from '@/components/OrderForm';
import Dropdown from '@/components/Dropdown';
import LiveSince from '@/components/LiveSince';
import { clock, dateTime, formatDuration, TWELVE_HOURS } from '@/lib/time';

const STATUS_OPTIONS = [
  { value: 'received', label: 'Received', dot: 'bg-amber-500' },
  { value: 'preparing', label: 'Preparing', dot: 'bg-sky-500' },
  { value: 'ready', label: 'Ready', dot: 'bg-ok' },
  { value: 'completed', label: 'Completed', dot: 'bg-muted' },
];
const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
];
const btn = 'rounded-full px-4 py-1.5 text-sm font-semibold';

const phoneOf = (o) => {
  const c = o.order_contacts;
  return (Array.isArray(c) ? c[0]?.phone : c?.phone) || '';
};

// One time line: "5:27 pm · 1h 12m 8s ago". Orders older than 12 hours show the full date instead.
function When({ iso, recent }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium">{recent ? clock(iso) : dateTime(iso)}</span>
      {recent && (
        <span className="tabular-nums text-muted">
          <LiveSince since={iso} /> ago
        </span>
      )}
    </span>
  );
}

function OrderDetails({ o }) {
  const phone = phoneOf(o);
  const created = new Date(o.created_at).getTime();
  const recent = Date.now() - created < TWELVE_HOURS;
  const after = (iso) => formatDuration(new Date(iso).getTime() - created);

  return (
    <dl className="mt-3 grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
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
      <dd><When iso={o.created_at} recent={recent} /></dd>

      {o.preparing_at && (
        <>
          <dt className="text-muted">Preparing</dt>
          <dd>
            <When iso={o.preparing_at} recent={recent} />
            <div className="text-xs text-muted">after {after(o.preparing_at)}</div>
          </dd>
        </>
      )}
      {o.ready_at && (
        <>
          <dt className="text-muted">Ready</dt>
          <dd>
            <When iso={o.ready_at} recent={recent} />
            <div className="text-xs text-muted">after {after(o.ready_at)}</div>
          </dd>
        </>
      )}
      {o.completed_at ? (
        <>
          <dt className="text-muted">Done</dt>
          <dd>
            <When iso={o.completed_at} recent={recent} />
            <div className="text-xs text-muted">Total time {after(o.completed_at)}</div>
          </dd>
        </>
      ) : o.status === 'completed' ? (
        <>
          <dt className="text-muted">Done</dt>
          <dd className="text-muted">Time not recorded</dd>
        </>
      ) : null}
    </dl>
  );
}

export default function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [range, setRange] = useState('today');
  const [filter, setFilter] = useState('all'); // all | active | completed
  const [editing, setEditing] = useState(null); // null | 'new' | an order
  const [error, setError] = useState('');

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

  async function patch(id, fields) {
    const { error: e } = await supabase.from('orders').update(fields).eq('id', id);
    setError(e ? 'Update failed.' : '');
    load();
  }

  async function remove(o) {
    if (!window.confirm(`Delete order #${o.id} (Table ${o.table_number})? This cannot be undone.`)) return;
    const { error: e } = await supabase.from('orders').delete().eq('id', o.id);
    setError(e ? 'Delete failed.' : '');
    load();
  }

  const shown = orders.filter(
    (o) => filter === 'all' || (filter === 'active' ? o.status !== 'completed' : o.status === 'completed')
  );
  const collected = orders.filter((o) => o.payment_status === 'paid').reduce((a, o) => a + o.total, 0);
  const toCollect = orders.filter((o) => o.payment_status !== 'paid').reduce((a, o) => a + o.total, 0);

  return (
    <section>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        {[
          ['Orders', orders.length],
          ['Collected', money(collected)],
          ['To collect', money(toCollect)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-card p-3">
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Dropdown variant="pill" value={range} onChange={setRange} options={RANGE_OPTIONS} ariaLabel="Date range" />
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`${btn} capitalize ${filter === f ? 'bg-accent text-white' : 'bg-chip'}`}
          >
            {f}
          </button>
        ))}
        <button onClick={() => setEditing('new')} className={`${btn} ml-auto bg-ok text-white`}>
          + New order
        </button>
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {shown.length === 0 && <p className="py-16 text-center text-muted">No orders here yet.</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {shown.map((o) => (
          <article key={o.id} className="min-w-0 rounded-2xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-xl font-bold">
                Table {o.table_number} <span className="text-sm font-normal text-muted">#{o.id}</span>
              </div>
              <Dropdown
                variant="pill"
                align="right"
                value={o.status}
                onChange={(v) => patch(o.id, { status: v })}
                options={STATUS_OPTIONS}
                ariaLabel={`Status of order ${o.id}`}
              />
            </div>
            <OrderDetails o={o} />

            <ul className="my-3 divide-y divide-line">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between py-1.5">
                  <span>{i.quantity} × {i.item_name}</span>
                  <span className="text-muted">{money(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            {o.note && <p className="mb-3 rounded-lg bg-chip p-2 text-sm text-accent">Note: {o.note}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-auto text-xl font-semibold">{money(o.total)}</span>
              <button
                onClick={() => patch(o.id, { payment_status: o.payment_status === 'paid' ? 'unpaid' : 'paid' })}
                className={`${btn} ${o.payment_status === 'paid' ? 'bg-okbg text-ok' : 'bg-chip text-accent'}`}
              >
                {o.payment_status === 'paid' ? 'Paid ✓' : 'Mark paid'}
              </button>
              <button onClick={() => setEditing(o)} className={`${btn} bg-chip`}>Edit</button>
              <button onClick={() => remove(o)} className={`${btn} bg-chip text-red-600`}>Delete</button>
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