'use client';
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
    <section className="min-w-0 rounded-lg border border-line bg-card p-4">
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
    <div className="min-w-0 rounded-lg border border-line bg-card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 truncate font-display text-2xl font-semibold tabular-nums">{value}</div>
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
// data: [{ key, label, value, title }]
export function ColumnChart({ data, ariaLabel, labelEvery = 1 }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const safeMax = max || 1;
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="mb-1 text-right text-[11px] text-muted">Peak {compactMoneyOrCount(max, data)}</div>
      <div className="flex h-40 items-end gap-1">
        {data.map((d) => (
          <div key={d.key} title={d.title} className="flex h-full min-w-0 flex-1 items-end">
            <div
              className={`w-full rounded-t-sm ${d.value === max && max > 0 ? 'bg-accent' : d.value > 0 ? 'bg-accent/55' : 'bg-line'}`}
              style={{ height: `${d.value > 0 ? Math.max(3, (d.value / safeMax) * 100) : 1}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-muted">
        {data.map((d, i) => (
          <div key={d.key} className="min-w-0 flex-1 text-center">
            {i % labelEvery === 0 ? d.label : ''}
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