// The basket. A line is { key, id, name, qty, sel, note, unit, optionsText, custom }.
// Two taps on the same plain dish are one line with qty 2. A customized dish with different choices is a separate line.
const MAX_QTY = 20;

export function lineKey(id, sel, note) {
  const s = Object.keys(sel || {})
    .sort()
    .map((k) => `${k}=${sel[k]}`)
    .join('&');
  return `${id}|${s}|${String(note || '').trim().toLowerCase()}`;
}

export function addToCart(lines, entry) {
  const key = lineKey(entry.id, entry.sel, entry.note);
  const i = lines.findIndex((l) => l.key === key);
  if (i >= 0) return lines.map((l, j) => (j === i ? { ...l, qty: Math.min(MAX_QTY, l.qty + entry.qty) } : l));
  return [...lines, { ...entry, key, note: String(entry.note || '').trim(), qty: Math.min(MAX_QTY, entry.qty) }];
}

export function changeQty(lines, key, delta) {
  return lines
    .map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + delta) } : l))
    .filter((l) => l.qty > 0);
}

export const removeLine = (lines, key) => lines.filter((l) => l.key !== key);

// Editing a customized line: take out the old line, then add the changed one (merges if it now matches another line).
export const replaceLine = (lines, oldKey, entry) => addToCart(removeLine(lines, oldKey), entry);

export function cartTotals(lines, taxRate) {
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = Math.round(lines.reduce((a, l) => a + l.unit * l.qty, 0) * 100) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  return { count, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

export const qtyForDish = (lines, id) => lines.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);