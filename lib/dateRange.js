// Date range helpers shared by the kitchen screens.
// A range is { key: 'today' | 'yesterday' | 'custom', from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }.
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const initialRange = () => ({ key: 'today', from: ymd(new Date()), to: ymd(new Date()) });

// ISO bounds for the Supabase query: created_at >= gte, and < lt (when lt is set).
export function rangeBounds({ key, from, to }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (key === 'today') return { gte: start.toISOString(), lt: null };
  if (key === 'yesterday') {
    const y = new Date(start);
    y.setDate(y.getDate() - 1);
    return { gte: y.toISOString(), lt: start.toISOString() };
  }
  const a = parseYmd(from);
  const b = parseYmd(to);
  b.setDate(b.getDate() + 1); // "to" day is included
  return { gte: a.toISOString(), lt: b.toISOString() };
}

const short = (s) => parseYmd(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Short wording for sentences: "today", "yesterday", "5 Oct", "5 Oct – 9 Oct"
export function rangeWord({ key, from, to }) {
  if (key === 'today') return 'today';
  if (key === 'yesterday') return 'yesterday';
  return from === to ? short(from) : `${short(from)} – ${short(to)}`;
}
