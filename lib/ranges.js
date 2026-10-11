const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const toInputDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fromInputDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: 'custom', label: 'Custom range' },
];

// Returns { from, to } where `to` is the first moment AFTER the range, or null if invalid.
export function rangeFor(key, customFrom, customTo) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  switch (key) {
    case 'today':
      return { from: today, to: tomorrow };
    case 'yesterday':
      return { from: addDays(today, -1), to: today };
    case '7d':
      return { from: addDays(today, -6), to: tomorrow };
    case '30d':
      return { from: addDays(today, -29), to: tomorrow };
    case 'month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow };
    case 'lastmonth':
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 1),
      };
    case 'custom': {
      if (!customFrom || !customTo) return null;
      const f = fromInputDate(customFrom);
      const t = addDays(fromInputDate(customTo), 1);
      if (t <= f || (t - f) / 86400000 > 366) return null;
      return { from: f, to: t };
    }
    default:
      return null;
  }
}

export const dayCount = (r) => Math.round((r.to.getTime() - r.from.getTime()) / 86400000);

export function eachDay(from, to) {
  const out = [];
  for (let d = new Date(from); d < to; d = addDays(d, 1)) out.push(toInputDate(d));
  return out;
}