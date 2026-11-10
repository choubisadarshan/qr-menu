'use client';
import { useMemo, useState } from 'react';
import { useDismiss } from '@/lib/useDismiss';
import { supabase } from '@/lib/supabase';
import { useScrollLock } from '@/lib/useScrollLock';
import { CONFIG, money } from '@/lib/config';
import { normalizeOptions } from '@/lib/options';

export default function OrderForm({ order, phone = '', menu, onClose, onSaved }) {
  useScrollLock(true);
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
  const [q, setQ] = useState('');

  // Click outside / Esc closes the form (asks first if something was typed)
  const [startSnap] = useState(() => JSON.stringify([table, name, ph, note, lines]));
  const dirty = JSON.stringify([table, name, ph, note, lines]) !== startSnap;
  function requestClose() {
    if (dirty && !window.confirm('Discard your changes?')) return;
    onClose();
  }
  const dismiss = useDismiss(requestClose);

  const subtotal = lines.reduce((a, l) => a + l.price * l.quantity, 0);
  const tax = Math.round(subtotal * CONFIG.taxRate * 100) / 100;
  const total = subtotal + tax;

  const pickable = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const groups = new Map();
    for (const m of menu) {
      if (normalizeOptions(m.options)) continue; // customizable dishes are ordered by guests
      if (needle && !String(m.name).toLowerCase().includes(needle)) continue;
      const cat = m.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(m);
    }
    return [...groups.entries()];
  }, [menu, q]);
  const hiddenCustom = menu.filter((m) => normalizeOptions(m.options)).length;

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

  const input = 'w-full rounded-xl border border-edge bg-card p-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 md:text-sm';
  return (
    <div className="scrim anim-scrim fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" {...dismiss}>
      <div className="anim-modal max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-edge bg-card p-4 shadow-sheet sm:rounded-3xl sm:p-5">
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
          <div key={`${l.name}|${l.options_text || ''}|${i}`} className="flex items-center justify-between gap-2 border-t border-edge py-2 first:border-0">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{l.name}</span>
              {l.options_text && <span className="block truncate text-xs text-muted">{l.options_text}</span>}
              {l.note && <span className="block truncate text-xs text-accent">Note: {l.note}</span>}
            </span>
            <div className="flex items-center rounded-lg border border-edge bg-chip p-1">
              <button onClick={() => qty(i, -1)} aria-label={`Remove one ${l.name}`} className="h-8 w-8 rounded-md border border-edge bg-card text-lg font-semibold">−</button>
              <span className="min-w-8 text-center font-semibold">{l.quantity}</span>
              <button onClick={() => qty(i, 1)} aria-label={`Add one ${l.name}`} className="h-8 w-8 rounded-md bg-accent text-lg font-semibold text-on-accent">+</button>
            </div>
            <span className="w-20 text-right">{money(l.price * l.quantity)}</span>
          </div>
        ))}

        <div className="mt-3 rounded-xl border border-edge">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dishes to add"
            aria-label="Search dishes to add"
            className="w-full rounded-t-xl border-b border-edge bg-card p-3 text-base outline-none focus:border-accent md:text-sm"
          />
          <div className="max-h-60 overflow-y-auto overscroll-contain">
            {menu.length === 0 && <p className="p-3 text-sm text-muted">No dishes found. Add dishes in Menu first (and make sure they are switched on).</p>}
            {menu.length > 0 && pickable.length === 0 && <p className="p-3 text-sm text-muted">{q ? 'No dish matches your search.' : 'No dishes can be added here.'}</p>}
            {pickable.map(([cat, list]) => (
              <div key={cat}>
                <div className="sticky top-0 bg-chip px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{cat}</div>
                {list.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addItem(String(m.id))}
                    className="flex w-full items-center justify-between gap-3 border-t border-edge px-3 py-2.5 text-left text-sm first:border-0 hover:bg-chip active:bg-chip"
                  >
                    <span className="min-w-0 truncate">{m.name}</span>
                    <span className="flex flex-none items-center gap-2 tabular-nums text-muted">
                      {money(m.price)}
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-base font-semibold leading-none text-on-accent" aria-hidden="true">+</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {hiddenCustom > 0 && (
            <p className="border-t border-edge px-3 py-2 text-xs text-muted">{hiddenCustom} customizable dish{hiddenCustom === 1 ? '' : 'es'} (pizza etc.) are ordered by guests from the menu.</p>
          )}
        </div>

        <div className="mt-4 flex justify-between border-t border-edge pt-3 text-lg font-semibold">
          <span>Total (incl. tax)</span>
          <span className="text-accent">{money(total)}</span>
        </div>

        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-edge bg-card p-3 font-semibold hover:bg-chip">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 rounded-xl bg-accent p-3 font-semibold text-on-accent disabled:opacity-60">
            {busy ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </div>
    </div>
  );
}