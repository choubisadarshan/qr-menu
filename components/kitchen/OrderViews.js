'use client';
import { money } from '@/lib/config';
import { clock, dateTime } from '@/lib/time';
import { isTakeaway, tableLabel } from '@/lib/orderType';
import { Icon, StatusPill } from '@/components/owner/ui';

const itemCount = (o) => o.order_items.reduce((a, i) => a + Number(i.quantity || 0), 0);
// How long an order took, from placed to completed: "<1 min", "5 min", "1h 05m"
const took = (o) => {
  if (!o.completed_at) return '';
  const m = Math.max(0, Math.round((new Date(o.completed_at) - new Date(o.created_at)) / 60000));
  if (m < 1) return '<1 min';
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};
const sub = (o) => [`#${o.id}`, o.customer_name].filter(Boolean).join(' · ');

function PaymentLine({ order, className = '' }) {
  const paid = order.payment_status === 'paid';
  return (
    <p className={`flex items-center gap-1.5 whitespace-nowrap font-semibold ${paid ? 'text-ok' : 'text-warn'} ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${paid ? 'bg-ok' : 'bg-warn'}`} />
      {paid ? 'Paid at counter' : 'Payment pending'}
    </p>
  );
}

function Items({ order, big }) {
  return (
    <ul className={big ? 'space-y-2.5' : 'space-y-1.5'}>
      {order.order_items.map((i) => (
        <li key={i.id} className="min-w-0">
          <div className={`flex items-baseline gap-2 font-semibold ${big ? 'text-base leading-snug' : 'text-sm leading-snug'}`}>
            <span className="flex-none whitespace-nowrap font-bold text-ok">{i.quantity} ×</span>
            <span className="min-w-0 break-words">{i.item_name}</span>
          </div>
          {i.options_text && <div className={`text-muted ${big ? 'mt-0.5 text-sm' : 'text-xs'}`}>{i.options_text}</div>}
          {i.note && <div className={`font-semibold text-warn ${big ? 'mt-0.5 text-sm' : 'text-xs'}`}>Note: {i.note}</div>}
        </li>
      ))}
    </ul>
  );
}

function CompleteButton({ onClick, compact }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-accent font-semibold text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.99] ${
        compact ? 'h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm' : 'h-10 w-full px-4 text-sm'
      }`}
    >
      <Icon name="check" size={compact ? 14 : 16} />
      {compact ? (
        <>
          <span className="sm:hidden">Complete</span>
          <span className="max-sm:hidden">Mark completed</span>
        </>
      ) : (
        'Mark completed'
      )}
    </button>
  );
}

// ---- Kitchen tab, GRID: the card from the design ------------------------------------------
export function KitchenCard({ order: o, onComplete }) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-edge bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xl font-bold leading-tight">{tableLabel(o.table_number)}</div>
          <div className="mt-0.5 truncate text-sm text-muted">{sub(o)}</div>
        </div>
        <span className="flex-none rounded-full bg-okbg px-3 py-1 text-xs font-semibold capitalize text-ok">{o.status}</span>
      </div>

      <hr className="my-3 border-line" />

      <div className="flex-1">
        <Items order={o} big />
        {o.note && <p className="mt-2.5 rounded-lg bg-chip p-2 text-xs font-semibold text-warn">Note: {o.note}</p>}
      </div>

      <PaymentLine order={o} className="mb-3 mt-4 text-sm" />
      <CompleteButton onClick={() => onComplete(o.id)} />
    </article>
  );
}

// ---- Kitchen tab, LIST: one compact row per order ------------------------------------------
export function KitchenList({ orders, onComplete }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-edge bg-card shadow-card">
      {orders.map((o) => (
        <li
          key={o.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 sm:py-3 md:grid-cols-[11rem_minmax(0,1fr)_6rem_9.5rem_10.5rem] md:gap-x-4"
        >
          <div className="min-w-0 max-md:col-start-1 max-md:row-start-1 md:col-start-1 md:row-start-1">
            <div className="truncate text-[15px] font-bold leading-tight sm:text-base">{tableLabel(o.table_number)}</div>
            <div className="truncate text-[11px] text-muted sm:text-xs">{sub(o)}</div>
          </div>

          <div className="flex justify-end max-md:col-start-2 max-md:row-start-1 md:col-start-3 md:row-start-1 md:justify-start">
            <span className="rounded-full bg-okbg px-2.5 py-0.5 text-[11px] font-semibold capitalize text-ok sm:text-xs">{o.status}</span>
          </div>

          <div className="min-w-0 max-md:col-span-2 max-md:row-start-2 md:col-start-2 md:row-start-1">
            <Items order={o} />
            {o.note && <p className="mt-1 text-xs font-semibold text-warn">Note: {o.note}</p>}
          </div>

          <PaymentLine order={o} className="text-xs sm:text-sm max-md:col-start-1 max-md:row-start-3 md:col-start-4 md:row-start-1" />

          <div className="max-md:col-start-2 max-md:row-start-3 md:col-start-5 md:row-start-1">
            <CompleteButton compact onClick={() => onComplete(o.id)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---- Order history -------------------------------------------------------------------------
function TableBadge({ order }) {
  const takeaway = isTakeaway(order.table_number);
  return (
    <div className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-accent text-on-accent">
      <div className="text-center leading-none">
        <div className="text-[8px] font-semibold uppercase tracking-wider opacity-80">{takeaway ? 'Take' : 'Table'}</div>
        <div className={`mt-0.5 font-bold ${takeaway ? 'text-[11px]' : 'text-base'}`}>{takeaway ? 'away' : order.table_number}</div>
      </div>
    </div>
  );
}

// LIST: a table on tablets / desktop, and on phones one plain row per order inside a single box
// (no separate cards, no coloured strip).
export function HistoryList({ orders }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-edge bg-card shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-chip text-xs uppercase tracking-wide text-muted">
            <tr>
              {['Order', 'Table', 'Customer', 'Date & time', 'Items', 'Total', 'Time taken', 'Status'].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3.5 font-bold">#{o.id}</td>
                <td className="px-4 py-3.5">{tableLabel(o.table_number)}</td>
                <td className="max-w-40 truncate px-4 py-3.5">{o.customer_name || '—'}</td>
                <td className="px-4 py-3.5 tabular-nums">{dateTime(o.created_at)}</td>
                <td className="px-4 py-3.5 tabular-nums">{itemCount(o)}</td>
                <td className="px-4 py-3.5 tabular-nums">{money(o.total)}</td>
                <td className="px-4 py-3.5 tabular-nums">{took(o) || '—'}</td>
                <td className="px-4 py-3.5">
                  <StatusPill status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-edge bg-card shadow-card md:hidden">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-3 py-2.5">
            <TableBadge order={o} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold leading-tight">
                {tableLabel(o.table_number)} <span className="text-xs font-normal text-muted">#{o.id}</span>
              </div>
              <div className="truncate text-xs text-muted">
                {clock(o.created_at)} · {itemCount(o)} item{itemCount(o) === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex-none text-right">
              <div className="font-bold tabular-nums">{money(o.total)}</div>
              <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-ok">
                <Icon name="check" size={12} /> Completed{took(o) && ` · ${took(o)}`}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// GRID: small tiles, two across on phones.
export function HistoryGrid({ orders }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {orders.map((o) => (
        <article key={o.id} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-edge bg-card p-3 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 truncate font-bold leading-tight">{tableLabel(o.table_number)}</div>
            <span className="inline-flex flex-none items-center text-ok" title="Completed" aria-label="Completed">
              <Icon name="check" size={16} />
            </span>
          </div>
          <div className="truncate text-xs text-muted">{sub(o)}</div>
          <div className="truncate text-xs text-muted">
            {clock(o.created_at)} · {itemCount(o)} item{itemCount(o) === 1 ? '' : 's'}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold tabular-nums">{money(o.total)}</span>
            {took(o) && <span className="text-xs font-semibold text-ok">{took(o)}</span>}
          </div>
        </article>
      ))}
    </div>
  );
}