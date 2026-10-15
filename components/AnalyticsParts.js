'use client';
import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '@/lib/config';

export function compactMoney(n) {
  const v = Math.round(Number(n) || 0);
  const c = CONFIG.currency;
  if (v >= 1e7) return `${c}${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${c}${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${c}${(v / 1e3).toFixed(1)}k`;
  return `${c}${v}`;
}

export function Panel({ title, hint, action, children }) {
  return (
    <section className="min-w-0 rounded-2xl border border-edge bg-card p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Kpi({ label, value, delta, sub }) {
  return (
    <div className="min-w-0 rounded-2xl border border-edge bg-card p-4 shadow-card">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 truncate font-sans text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 min-h-4 text-xs">
        {delta != null ? (
          <span className={delta >= 0 ? 'text-ok' : 'text-red-500'}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
            <span className="text-muted"> vs previous</span>
          </span>
        ) : sub ? (
          <span className="text-muted">{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

// Vertical bar chart built from plain divs (responsive, follows light/dark theme).
// data: [{ key, label, value, isMoney?, tip: { title, value, sub } }]
// Hover with a mouse, or touch and drag a finger across the bars: the bar under the pointer is
// highlighted and a small box shows its details. Vertical swipes still scroll the page.
export function ColumnChart({ data, ariaLabel, labelEvery = 1 }) {
  const [active, setActive] = useState(null);
  const plot = useRef(null);
  const hideTimer = useRef(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const safeMax = max || 1;
  const n = data.length;

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function pick(e) {
    const r = plot.current?.getBoundingClientRect();
    if (!r || !n) return;
    const i = Math.floor(((e.clientX - r.left) / r.width) * n);
    setActive(Math.min(n - 1, Math.max(0, i)));
  }
  function onDown(e) {
    clearTimeout(hideTimer.current);
    pick(e);
  }
  function onUp(e) {
    // On touch screens the box lingers briefly after lifting the finger, then fades away.
    if (e.pointerType === 'touch') {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setActive(null), 2200);
    }
  }
  function onMove(e) {
    if (e.pointerType === 'mouse' || e.buttons > 0 || e.pointerType === 'touch') pick(e);
  }

  const d = active != null ? data[active] : null;
  // Keep the box inside the chart: pin to the left/right edge near the ends.
  const pos = active != null ? ((active + 0.5) / n) * 100 : 0;
  const edge = pos < 18 ? 'left' : pos > 82 ? 'right' : 'center';

  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="mb-1 text-right text-[11px] text-muted">Peak {compactMoneyOrCount(max, data)}</div>
      <div className="relative">
        {d?.tip && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-edge bg-card px-2.5 py-1.5 text-xs shadow-xl"
            style={{
              top: `${100 - (d.value > 0 ? Math.max(3, (d.value / safeMax) * 100) : 1)}%`,
              marginTop: '-6px',
              ...(edge === 'center'
                ? { left: `${pos}%`, transform: 'translate(-50%, -100%)' }
                : edge === 'left'
                  ? { left: 0, transform: 'translateY(-100%)' }
                  : { right: 0, transform: 'translateY(-100%)' }),
            }}
          >
            <div className="font-semibold">{d.tip.title}</div>
            <div className="font-sans tabular-nums text-accent">{d.tip.value}</div>
            {d.tip.sub && <div className="text-muted">{d.tip.sub}</div>}
          </div>
        )}
        <div
          ref={plot}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
          onPointerCancel={() => setActive(null)}
          className="flex h-40 cursor-crosshair touch-pan-y select-none items-end gap-1"
        >
          {data.map((c, i) => {
            const top = c.value === max && max > 0;
            return (
              <div key={c.key} className="flex h-full min-w-0 flex-1 items-end">
                <div
                  className={`w-full rounded-t-sm transition-opacity ${top ? 'bg-accent' : c.value > 0 ? 'bg-accent/55' : 'bg-line'} ${active != null && active !== i ? 'opacity-45' : ''}`}
                  style={{ height: `${c.value > 0 ? Math.max(3, (c.value / safeMax) * 100) : 1}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-muted">
        {data.map((c, i) => (
          <div key={c.key} className="min-w-0 flex-1 text-center">
            {i % labelEvery === 0 ? c.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function compactMoneyOrCount(max, data) {
  return data.some((d) => d.isMoney) ? compactMoney(max) : String(Math.round(max));
}

// Horizontal ranked bars. rows: [{ key, label, value, right, sub }]
export function BarList({ rows, empty = 'No data yet.' }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key ?? r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 tabular-nums text-muted">{i + 1}</span>
              <span className="font-medium">{r.label}</span>
            </span>
            <span className="flex-none tabular-nums">{r.right}</span>
          </div>
          <div className="mt-1 h-2 bg-chip" aria-hidden="true">
            <div className="h-full bg-accent" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
          {r.sub && <div className="mt-0.5 text-xs text-muted">{r.sub}</div>}
        </li>
      ))}
    </ol>
  );
}