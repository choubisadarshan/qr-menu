import { CONFIG } from './config';
import { normalizeOptions, validateSelection, priceFor, describe } from './options';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const round2 = (n) => Math.round(n * 100) / 100;

// Checks what the browser sent. Returns { error } or { value }.
export function parseOrderBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (!UUID.test(String(b.session ?? ''))) return { error: 'Invalid session. Please scan the QR code again.' };

  const table = String(b.table ?? '').replace(/[^\w-]/g, '').slice(0, 6);
  if (!table) return { error: 'Invalid table.' };

  const name = String(b.name ?? '').trim().slice(0, 40);
  if (!name) return { error: 'Please enter your name so we can call it out.' };

  const phone = String(b.phone ?? '').trim();
  if (phone && !/^\d{10}$/.test(phone)) return { error: 'Phone number should be 10 digits.' };

  const note = String(b.note ?? '').trim().slice(0, 200) || null;

  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 40) return { error: 'Your cart is empty.' };
  const lines = [];
  for (const it of b.items) {
    const id = Number(it?.id);
    const qty = Math.floor(Number(it?.qty));
    if (!Number.isInteger(id) || !(qty >= 1 && qty <= 20)) return { error: 'Invalid item in your cart.' };
    const options = it?.options && typeof it.options === 'object' && !Array.isArray(it.options) ? it.options : {};
    lines.push({ id, qty, options, note: String(it?.note ?? '').trim().slice(0, 120) || null });
  }
  if (lines.reduce((a, l) => a + l.qty, 0) > 100) return { error: 'Too many items in one order. Please split it.' };
  return { value: { session: b.session, table, name, phone, note, lines } };
}

// Prices ALWAYS come from the database, never from the browser. Customized dishes are checked against
// the dish's real options and priced with the same function the browser uses.
export function priceOrder(dishes, lines) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const out = [];
  for (const l of lines) {
    const d = byId.get(l.id);
    if (!d || d.available === false) {
      return { error: 'A dish in your cart is no longer available. Please refresh the menu.' };
    }
    const opts = normalizeOptions(d.options);
    let sel = {};
    let optionsText = null;
    if (opts) {
      const v = validateSelection(opts, l.options);
      if (v.error) return { error: v.error };
      sel = v.sel;
      optionsText = describe(opts, sel) || null;
    }
    out.push({ name: d.name, price: priceFor(d.price, opts, sel), quantity: l.qty, options_text: optionsText, note: l.note });
  }
  const subtotal = round2(out.reduce((a, l) => a + l.price * l.quantity, 0));
  const tax = round2(subtotal * CONFIG.taxRate);
  return { lines: out, subtotal, tax, total: round2(subtotal + tax) };
}

// A visit stays OPEN while the guest still has something unfinished or unpaid, and the newest order is recent.
// Once everything is completed AND paid (or it is too old), the next scan starts a brand-new visit.
// `orders` must be sorted newest first.
export function isSessionOpen(orders, now = Date.now(), maxHours = 6) {
  if (!Array.isArray(orders) || orders.length === 0) return false;
  const newest = new Date(orders[0].created_at).getTime();
  if (!(now - newest < maxHours * 3600000)) return false;
  return orders.some((o) => o.status !== 'completed' || o.payment_status !== 'paid');
}