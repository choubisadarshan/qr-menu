'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CONFIG, money } from '@/lib/config';
import Dropdown from '@/components/Dropdown';
import { normalizeOptions } from '@/lib/options';

export default function OrderForm({ order, phone = '', menu, onClose, onSaved }) {
  const [table, setTable] = useState(order?.table_number || '');
  const [name, setName] = useState(order?.customer_name || '');
  const [ph, setPh] = useState(phone);
  const [note, setNote] = useState(order?.note || '');
  const [lines, setLines] = useState(
    (order?.order_items || []).map((i) => ({
      name: i.item_name,
      price: Number(i.price),
      quantity: i.quantity,
      options_text: i.options_text ?? null,
      note: i.note ?? null,
    }))
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const subtotal = lines.reduce((a, l) => a + l.price * l.quantity, 0);
  const tax = Math.round(subtotal * CONFIG.taxRate * 100) / 100;
  const total = subtotal + tax;

  function addItem(id) {
    const m = menu.find((x) => String(x.id) === id);
    if (!m) return;
    setLines((ls) => {
      const i = ls.findIndex((l) => l.name === m.name && !l.options_text && !l.note);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { name: m.name, price: Number(m.price), quantity: 1, options_text: null, note: null }];
    });
  }

  const qty = (i, d) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, quantity: l.quantity + d } : l)).filter((l) => l.quantity > 0));

  function fail() {
    setBusy(false);
    setError('Could not save. Check your connection and try again.');
  }

  async function save() {
    if (!String(table).trim()) return setError('Enter a table number.');
    if (!name.trim()) return setError('Enter the customer name.');
    if (!lines.length) return setError('Add at least one item.');
    if (ph && !/^\d{10}$/.test(ph)) return setError('Phone number should be 10 digits.');
    setBusy(true);
    setError('');

    const fields = {
      table_number: String(table).trim(),
      customer_name: name.trim(),
      note: note.trim() || null,
      subtotal,
      tax,
      total,
    };
    let id = order?.id;
    if (id) {
      const { error: e } = await supabase.from('orders').update(fields).eq('id', id);
      if (e) return fail();
      await supabase.from('order_items').delete().eq('order_id', id);
    } else {
      const { data, error: e } = await supabase.from('orders').insert(fields).select().single();
      if (e) return fail();
      id = data.id;
    }
    const { error: e2 } = await supabase
      .from('order_items')
      .insert(
        lines.map((l) => ({
          order_id: id,
          item_name: l.name,
          price: l.price,
          quantity: l.quantity,
          options_text: l.options_text ?? null,
          note: l.note ?? null,
        }))
      );
    if (e2) return fail();

    if (ph) await supabase.from('order_contacts').upsert({ order_id: id, phone: ph });
    else await supabase.from('order_contacts').delete().eq('order_id', id);

    setBusy(false);
    onSaved();
  }

  const input = 'w-full rounded-xl bg-chip p-3 outline-none focus:ring-2 focus:ring-accent';
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bg p-4 sm:rounded-3xl">
        <h2 className="mb-3 text-xl font-semibold">{order ? `Edit order #${order.id}` : 'New order'}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="of-table" className="mb-1 block text-sm font-medium">Table</label>
            <input id="of-table" className={input} value={table} onChange={(e) => setTable(e.target.value)} maxLength={6} />
          </div>
          <div>
            <label htmlFor="of-name" className="mb-1 block text-sm font-medium">Customer name</label>
            <input id="of-name" className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>
        </div>
        <label htmlFor="of-phone" className="mb-1 mt-3 block text-sm font-medium">Phone (optional)</label>
        <input id="of-phone" className={input} value={ph} onChange={(e) => setPh(e.target.value)} inputMode="numeric" maxLength={10} />
        <label htmlFor="of-note" className="mb-1 mt-3 block text-sm font-medium">Kitchen note (optional)</label>
        <input id="of-note" className={input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />

        <h3 className="mb-1 mt-4 text-sm font-semibold text-muted">Items</h3>
        {lines.length === 0 && <p className="py-2 text-sm text-muted">No items yet. Add a dish below.</p>}
        {lines.map((l, i) => (
          <div key={`${l.name}|${l.options_text || ''}|${i}`} className="flex items-center justify-between gap-2 border-t border-line py-2 first:border-0">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{l.name}</span>
              {l.options_text && <span className="block truncate text-xs text-muted">{l.options_text}</span>}
              {l.note && <span className="block truncate text-xs text-accent">Note: {l.note}</span>}
            </span>
            <div className="flex items-center rounded-md bg-chip p-1">
              <button onClick={() => qty(i, -1)} aria-label={`Remove one ${l.name}`} className="h-8 w-8 rounded-md bg-card text-lg font-semibold">−</button>
              <span className="min-w-8 text-center font-semibold tabular-nums">{l.quantity}</span>
              <button onClick={() => qty(i, 1)} aria-label={`Add one ${l.name}`} className="h-8 w-8 rounded-md bg-accent text-lg font-semibold text-on-accent">+</button>
            </div>
            <span className="w-20 text-right tabular-nums">{money(l.price * l.quantity)}</span>
          </div>
        ))}

        <div className="mt-2">
          <Dropdown
            variant="field"
            value=""
            onChange={addItem}
            options={menu
              .filter((m) => !normalizeOptions(m.options)) // customizable dishes are ordered by guests
              .map((m) => ({ value: String(m.id), label: `${m.name} · ${money(m.price)}` }))}
            placeholder="+ Add a dish"
            ariaLabel="Add a dish"
          />
        </div>

        <div className="mt-4 flex justify-between border-t border-line pt-3 text-lg font-semibold">
          <span>Total (incl. tax)</span>
          <span className="tabular-nums text-accent">{money(total)}</span>
        </div>

        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl bg-chip p-3 font-semibold">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 rounded-xl bg-accent p-3 font-semibold text-on-accent disabled:opacity-60">
            {busy ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </div>
    </div>
  );
}