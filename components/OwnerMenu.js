'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/config';

const EMPTY = { name: '', description: '', price: '', category: '', is_veg: true, tag: '', emoji: '🍽️', available: true };
const btn = 'rounded-full px-4 py-1.5 text-sm font-semibold';
const input = 'w-full rounded-xl bg-chip p-3 outline-none focus:ring-2 focus:ring-accent';

export default function OwnerMenu() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('menu_items').select('*').order('category').order('name');
    if (e) setError('Could not load the menu.');
    else setItems(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    const price = Number(form.price);
    if (!form.name.trim() || !form.category.trim() || form.price === '' || !(price >= 0)) {
      return setError('Name, category and a valid price are required.');
    }
    const row = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      category: form.category.trim(),
      is_veg: form.is_veg,
      tag: form.tag.trim() || null,
      emoji: form.emoji.trim() || '🍽️',
      available: form.available,
    };
    const { error: e } = form.id
      ? await supabase.from('menu_items').update(row).eq('id', form.id)
      : await supabase.from('menu_items').insert(row);
    if (e) return setError('Could not save the dish.');
    setForm(null);
    setError('');
    load();
  }

  async function toggle(m) {
    await supabase.from('menu_items').update({ available: !m.available }).eq('id', m.id);
    load();
  }

  async function remove(m) {
    if (!window.confirm(`Remove "${m.name}" from the menu?`)) return;
    await supabase.from('menu_items').delete().eq('id', m.id);
    load();
  }

  const categories = [...new Set(items.map((m) => m.category))];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{items.length} dishes</p>
        <button onClick={() => { setForm(EMPTY); setError(''); }} className={`${btn} bg-ok text-white`}>
          + Add dish
        </button>
      </div>
      {error && !form && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((m) => (
          <article key={m.id} className={`flex items-center gap-3 rounded-2xl border border-line bg-card p-3 ${m.available ? '' : 'opacity-60'}`}>
            <div aria-hidden className="grid h-14 w-14 flex-none place-items-center rounded-xl bg-chip text-3xl">{m.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">
                <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${m.is_veg ? 'bg-ok' : 'bg-red-700'}`} />
                {m.name}
              </div>
              <div className="text-sm text-muted">{m.category} · {money(m.price)}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => toggle(m)} className={`${btn} ${m.available ? 'bg-okbg text-ok' : 'bg-chip text-muted'}`}>
                {m.available ? 'In stock' : 'Out of stock'}
              </button>
              <div className="flex gap-1.5">
                <button onClick={() => { setForm({ ...m, price: String(m.price), description: m.description || '', tag: m.tag || '' }); setError(''); }} className={`${btn} flex-1 bg-chip`}>Edit</button>
                <button onClick={() => remove(m)} className={`${btn} bg-chip text-red-600`}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bg p-4 sm:rounded-3xl">
            <h2 className="mb-3 text-xl font-semibold">{form.id ? 'Edit dish' : 'Add dish'}</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="m-name" className="mb-1 block text-sm font-medium">Name</label>
                <input id="m-name" className={input} value={form.name} onChange={set('name')} maxLength={60} />
              </div>
              <div>
                <label htmlFor="m-desc" className="mb-1 block text-sm font-medium">Description</label>
                <input id="m-desc" className={input} value={form.description} onChange={set('description')} maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="m-price" className="mb-1 block text-sm font-medium">Price</label>
                  <input id="m-price" type="number" min="0" step="0.5" inputMode="decimal" className={input} value={form.price} onChange={set('price')} />
                </div>
                <div>
                  <label htmlFor="m-cat" className="mb-1 block text-sm font-medium">Category</label>
                  <input id="m-cat" list="cats" className={input} value={form.category} onChange={set('category')} maxLength={30} />
                  <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label htmlFor="m-tag" className="mb-1 block text-sm font-medium">Tag (optional)</label>
                  <input id="m-tag" className={input} value={form.tag} onChange={set('tag')} maxLength={20} placeholder="Popular" />
                </div>
                <div>
                  <label htmlFor="m-emoji" className="mb-1 block text-sm font-medium">Emoji</label>
                  <input id="m-emoji" className={input} value={form.emoji} onChange={set('emoji')} maxLength={4} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_veg} onChange={(e) => setForm({ ...form, is_veg: e.target.checked })} />
                Vegetarian
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                Available to order
              </label>
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setForm(null); setError(''); }} className="flex-1 rounded-xl bg-chip p-3 font-semibold">Cancel</button>
              <button onClick={save} className="flex-1 rounded-xl bg-accent p-3 font-semibold text-white">Save dish</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}