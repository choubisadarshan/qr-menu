'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CONFIG, money } from '@/lib/config';
import { formatDuration } from '@/lib/time';
import { PRESETS, rangeFor, eachDay, dayCount, toInputDate } from '@/lib/ranges';
import { Panel, Kpi, ColumnChart, BarList, compactMoney } from '@/components/AnalyticsParts';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hourShort = (h) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
const hourLong = (h) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
const shortDate = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const change = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const num = (v) => Number(v) || 0;

function exportCsv(range, cur) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const t = cur.totals;
  const rows = [
    ['Report', `${toInputDate(range.from)} to ${toInputDate(new Date(range.to.getTime() - 86400000))}`],
    ['Orders', t.orders],
    ['Sales (incl. tax)', t.sales],
    ['Collected', t.collected],
    ['Pending', t.pending],
    [],
    ['Day', 'Orders', 'Sales'],
    ...cur.daily.map((d) => [d.day, d.orders, d.sales]),
    [],
    ['Dish', 'Quantity', 'Revenue'],
    ...cur.dishes.map((d) => [d.item_name, d.qty, d.revenue]),
    [],
    ['Category', 'Quantity', 'Revenue'],
    ...cur.categories.map((c) => [c.category, c.qty, c.revenue]),
  ];
  const csv = rows.map((r) => r.map(q).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${CONFIG.name}-report-${toInputDate(range.from)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function OwnerAnalytics() {
  const [preset, setPreset] = useState('7d');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toInputDate(d);
  });
  const [customTo, setCustomTo] = useState(() => toInputDate(new Date()));
  const [sortBy, setSortBy] = useState('qty'); // qty | revenue
  const [showAll, setShowAll] = useState(false);
  const [data, setData] = useState({ loading: true, error: '', cur: null, prev: null });
  const req = useRef(0);

  const range = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    if (!range) return;
    const id = ++req.current;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    const len = range.to.getTime() - range.from.getTime();
    const call = (from, to) =>
      supabase.rpc('owner_analytics', { p_from: from.toISOString(), p_to: to.toISOString(), p_tz: tz });
    const [cur, prev] = await Promise.all([
      call(range.from, range.to),
      call(new Date(range.from.getTime() - len), range.from),
    ]);
    if (id !== req.current) return; // an older request finished late
    if (cur.error) return setData({ loading: false, error: cur.error.message, cur: null, prev: null });
    setData({ loading: false, error: '', cur: cur.data, prev: prev.error ? null : prev.data });
  }, [range]);

  useEffect(() => {
    if (!range) return;
    setData((d) => ({ ...d, loading: true }));
    load();
    const live = range.to.getTime() > Date.now();
    const timer = live ? setInterval(load, 60000) : null; // keep today's numbers fresh
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [range, load]);

  const { cur, prev } = data;
  const t = cur?.totals;
  const pt = prev?.totals;
  const days = range ? dayCount(range) : 0;

  const dailyRows = useMemo(() => {
    if (!cur || !range) return [];
    const map = new Map(cur.daily.map((d) => [d.day, d]));
    return eachDay(range.from, range.to).map((day) => ({
      day,
      orders: map.get(day)?.orders ?? 0,
      sales: num(map.get(day)?.sales),
    }));
  }, [cur, range]);

  const hourRows = useMemo(() => {
    const map = new Map((cur?.hourly ?? []).map((h) => [h.hour, h]));
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: map.get(h)?.orders ?? 0,
      sales: num(map.get(h)?.sales),
    }));
  }, [cur]);

  const weekRows = useMemo(() => {
    const map = new Map((cur?.weekday ?? []).map((w) => [w.dow, w]));
    return WEEKDAYS.map((label, i) => ({
      label,
      orders: map.get(i + 1)?.orders ?? 0,
      sales: num(map.get(i + 1)?.sales),
    }));
  }, [cur]);

  const dishRows = useMemo(() => {
    const list = [...(cur?.dishes ?? [])];
    list.sort(sortBy === 'qty' ? (a, b) => b.qty - a.qty || b.revenue - a.revenue : (a, b) => b.revenue - a.revenue);
    return list;
  }, [cur, sortBy]);

  const rangeLabel = range
    ? `${shortDate(toInputDate(range.from))} to ${shortDate(toInputDate(new Date(range.to.getTime() - 86400000)))} · ${days} day${days > 1 ? 's' : ''}`
    : '';

  /* ----- highlights ----- */
  const busiest = hourRows.reduce((a, b) => (b.orders > a.orders ? b : a), hourRows[0]);
  const bestDay = dailyRows.reduce((a, b) => (b.sales > a.sales ? b : a), dailyRows[0] ?? { sales: 0 });
  const topDish = cur?.dishes?.[0];
  const highlights = [];
  if (t && t.orders > 0) {
    if (topDish) highlights.push(`Best seller: ${topDish.item_name} (${topDish.qty} sold).`);
    if (busiest?.orders > 0) highlights.push(`Busiest hour: ${hourLong(busiest.hour)} (${busiest.orders} orders).`);
    if (days > 1 && bestDay?.sales > 0) highlights.push(`Best day: ${shortDate(bestDay.day)} with ${money(bestDay.sales)} in sales.`);
    if (t.unpaid_orders > 0) highlights.push(`${t.unpaid_orders} order${t.unpaid_orders > 1 ? 's are' : ' is'} still unpaid (${money(t.pending)}).`);
  }

  const visibleDishes = showAll ? dishRows : dishRows.slice(0, 8);
  const catTotal = (cur?.categories ?? []).reduce((a, c) => a + num(c.revenue), 0) || 1;
  const paidShare = t && num(t.sales) > 0 ? (num(t.collected) / num(t.sales)) * 100 : 0;

  const chip = 'rounded-md border px-3.5 py-1.5 text-sm font-medium';
  const dateInput = 'rounded-md bg-chip p-2.5 text-sm outline-none focus:ring-2 focus:ring-accent';

  return (
    <section className="space-y-4">
      <Panel
        title="Date range"
        hint={range ? rangeLabel : 'Choose a valid range (up to 366 days).'}
        action={
          cur && range ? (
            <button onClick={() => exportCsv(range, cur)} className="rounded-md bg-chip px-3.5 py-1.5 text-sm font-semibold">
              Download CSV
            </button>
          ) : null
        }
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              aria-pressed={preset === p.key}
              className={`${chip} ${preset === p.key ? 'border-accent bg-accent text-on-accent' : 'border-line bg-card'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
            <div>
              <label htmlFor="an-from" className="mb-1 block text-xs text-muted">From</label>
              <input id="an-from" type="date" className={`${dateInput} w-full`} value={customFrom}
                max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label htmlFor="an-to" className="mb-1 block text-xs text-muted">To</label>
              <input id="an-to" type="date" className={`${dateInput} w-full`} value={customTo}
                min={customFrom || undefined} max={toInputDate(new Date())} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}
      </Panel>

      {data.error && (
        <div role="alert" className="rounded-lg border border-line bg-card p-4 text-sm">
          <p className="font-semibold text-red-500">Could not load analytics.</p>
          <p className="mt-1 text-muted">
            Make sure the analytics SQL was run in Supabase and you are signed in as the owner. Details: {data.error}
          </p>
        </div>
      )}

      {data.loading && !cur && !data.error && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-chip" />
          ))}
        </div>
      )}

      {cur && t && (
        <>
          {t.orders === 0 ? (
            <p className="rounded-lg border border-line bg-card p-8 text-center text-muted">
              No orders in this date range.
            </p>
          ) : (
            <>
              {highlights.length > 0 && (
                <Panel title="Highlights">
                  <ul className="space-y-1.5 text-sm">
                    {highlights.map((h) => (
                      <li key={h} className="flex gap-2">
                        <span className="text-accent" aria-hidden="true">◆</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Sales (incl. tax)" value={money(t.sales)} delta={pt ? change(num(t.sales), num(pt.sales)) : null} />
                <Kpi label="Orders" value={t.orders} delta={pt ? change(t.orders, pt.orders) : null} />
                <Kpi label="Average order" value={money(Math.round(num(t.avg_order)))} delta={pt ? change(num(t.avg_order), num(pt.avg_order)) : null} />
                <Kpi label="Items sold" value={cur.items_sold} delta={prev ? change(cur.items_sold, prev.items_sold) : null} />
                <Kpi label="Collected" value={money(t.collected)} sub="Paid at the counter" />
                <Kpi label="Pending" value={money(t.pending)} sub={`${t.unpaid_orders} unpaid order${t.unpaid_orders === 1 ? '' : 's'}`} />
                <Kpi label="Tax (GST) in sales" value={money(t.tax)} sub={`Net sales ${money(t.subtotal)}`} />
                <Kpi label="Avg. order time" value={num(t.avg_seconds) > 0 ? formatDuration(num(t.avg_seconds) * 1000) : '—'} sub="Placed to done" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {days > 1 ? (
                  <Panel title="Sales by day" hint="Highest day is highlighted">
                    <ColumnChart
                      ariaLabel="Sales by day"
                      labelEvery={Math.max(1, Math.ceil(dailyRows.length / 7))}
                      data={dailyRows.map((d) => ({
                        key: d.day,
                        label: shortDate(d.day),
                        value: d.sales,
                        isMoney: true,
                        title: `${shortDate(d.day)}: ${money(d.sales)} · ${d.orders} orders`,
                      }))}
                    />
                  </Panel>
                ) : (
                  <Panel title="Sales by hour" hint="When the money comes in">
                    <ColumnChart
                      ariaLabel="Sales by hour"
                      labelEvery={3}
                      data={hourRows.map((h) => ({
                        key: h.hour,
                        label: hourShort(h.hour),
                        value: h.sales,
                        isMoney: true,
                        title: `${hourLong(h.hour)}: ${money(h.sales)} · ${h.orders} orders`,
                      }))}
                    />
                  </Panel>
                )}

                {days > 1 && (
                  <Panel title="Busiest hours" hint="Orders by hour of day, across the range">
                    <ColumnChart
                      ariaLabel="Orders by hour of day"
                      labelEvery={3}
                      data={hourRows.map((h) => ({
                        key: h.hour,
                        label: hourShort(h.hour),
                        value: h.orders,
                        title: `${hourLong(h.hour)}: ${h.orders} orders`,
                      }))}
                    />
                  </Panel>
                )}

                {days >= 7 && (
                  <Panel title="Busiest days of the week" hint="Sales by weekday, across the range">
                    <ColumnChart
                      ariaLabel="Sales by weekday"
                      data={weekRows.map((w) => ({
                        key: w.label,
                        label: w.label,
                        value: w.sales,
                        isMoney: true,
                        title: `${w.label}: ${money(w.sales)} · ${w.orders} orders`,
                      }))}
                    />
                  </Panel>
                )}

                <Panel
                  title="Most ordered dishes"
                  hint={sortBy === 'qty' ? 'Ranked by number sold' : 'Ranked by revenue'}
                  action={
                    <div className="flex gap-1" role="group" aria-label="Rank dishes by">
                      {[['qty', 'Sold'], ['revenue', 'Revenue']].map(([k, l]) => (
                        <button key={k} onClick={() => setSortBy(k)} aria-pressed={sortBy === k}
                          className={`rounded-md border px-3 py-1 text-xs font-semibold ${sortBy === k ? 'border-accent bg-accent text-on-accent' : 'border-line'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <BarList
                    empty="No dishes sold in this range."
                    rows={visibleDishes.map((d) => ({
                      key: d.item_name,
                      label: d.item_name,
                      value: sortBy === 'qty' ? d.qty : num(d.revenue),
                      right: sortBy === 'qty' ? `${d.qty} sold` : money(d.revenue),
                      sub: sortBy === 'qty' ? money(d.revenue) : `${d.qty} sold`,
                    }))}
                  />
                  {dishRows.length > 8 && (
                    <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-semibold text-accent">
                      {showAll ? 'Show top 8' : `Show all ${dishRows.length} dishes`}
                    </button>
                  )}
                </Panel>

                <Panel title="Slow sellers" hint="Lowest-selling dishes on your menu. Consider a deal or removing them">
                  <BarList
                    empty="Every dish is selling."
                    rows={(cur.slow ?? []).map((d) => ({
                      key: d.item_name,
                      label: d.item_name,
                      value: d.qty,
                      right: `${d.qty} sold`,
                    }))}
                  />
                </Panel>

                <Panel title="Sales by category" hint="Which part of the menu earns the most">
                  <BarList
                    rows={(cur.categories ?? []).map((c) => ({
                      key: c.category,
                      label: c.category,
                      value: num(c.revenue),
                      right: money(c.revenue),
                      sub: `${Math.round((num(c.revenue) / catTotal) * 100)}% of dish sales · ${c.qty} items`,
                    }))}
                  />
                </Panel>

                <Panel title="Top tables" hint="Tables that bring in the most sales">
                  <BarList
                    rows={(cur.tables ?? []).slice(0, 6).map((tb) => ({
                      key: tb.table_number,
                      label: `Table ${tb.table_number}`,
                      value: num(tb.sales),
                      right: money(tb.sales),
                      sub: `${tb.orders} order${tb.orders === 1 ? '' : 's'}`,
                    }))}
                  />
                </Panel>

                <Panel title="Payments" hint="Cash and UPI collected at the counter">
                  <div className="flex h-3 overflow-hidden bg-chip" role="img"
                    aria-label={`${Math.round(paidShare)} percent of sales collected`}>
                    <div className="bg-ok" style={{ width: `${paidShare}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted">Collected</div>
                      <div className="text-lg font-semibold text-ok">{money(t.collected)}</div>
                    </div>
                    <div>
                      <div className="text-muted">Still to collect</div>
                      <div className="text-lg font-semibold">{money(t.pending)}</div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted">Sales {money(t.sales)} across {t.orders} orders. Compact: {compactMoney(t.sales)}.</p>
                </Panel>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}