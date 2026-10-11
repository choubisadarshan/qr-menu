import { CONFIG } from './config';

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
  const qtyById = new Map();
  for (const it of b.items) {
    const id = Number(it?.id);
    const qty = Math.floor(Number(it?.qty));
    if (!Number.isInteger(id) || !(qty >= 1 && qty <= 20)) return { error: 'Invalid item in your cart.' };
    qtyById.set(id, Math.min(20, (qtyById.get(id) || 0) + qty));
  }
  return { value: { session: b.session, table, name, phone, note, qtyById } };
}

// Prices ALWAYS come from the database, never from the browser.
export function priceOrder(dishes, qtyById) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const lines = [];
  for (const [id, quantity] of qtyById) {
    const d = byId.get(id);
    if (!d || d.available === false) {
      return { error: 'A dish in your cart is no longer available. Please refresh the menu.' };
    }
    lines.push({ name: d.name, price: Number(d.price), quantity });
  }
  const subtotal = round2(lines.reduce((a, l) => a + l.price * l.quantity, 0));
  const tax = round2(subtotal * CONFIG.taxRate);
  return { lines, subtotal, tax, total: round2(subtotal + tax) };
}