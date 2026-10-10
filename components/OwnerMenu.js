'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/config';

const btn = 'rounded-full px-4 py-1.5 text-sm font-semibold';
const input = 'w-full rounded-xl bg-chip p-3 outline-none focus:ring-2 focus:ring-accent';

const EMPTY = {
  id: null,
  name: '',
  description: '',
  price: '',
  category: '',
  is_veg: true,
  tag: '',
  emoji: '🍽️',
  available: true,
};

function toForm(m) {
  return {
    id: m.id,
    name: m.name ?? '',
    description: m.description ?? '',
    price: m.price == null ? '' : String(m.price),
    category: m.category ?? '',
    is_veg: m.is_veg !== false,
    tag: m.tag ?? '',
    emoji: m.emoji ?? '🍽️',
    available: m.available !== false,
  };
}

function DishForm({ initial, categories, onCancel, onSaved }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const flag = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.checked }));

  async function save() {
    const price = Number(f.price);
    if (!f.name.trim() || !f.category.trim() || f.price === '' || Number.isNaN(price) || price < 0) {
      return setError('Name, category and a valid price are required.');
    }
    setBusy(true);
    setError('');
    const row = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      price,
      category: f.category.trim(),
      is_veg: f.is_veg,
      tag: f.tag.trim() || null,
      emoji: f.emoji.trim() || '🍽️',
      available: f.available,
    };
    const q = f.id
      ? supabase.from('menu_items').update(row).eq('id', f.id)
      : supabase.from('menu_items').insert(row);
    const { data, error: e } = await q.select();
    setBusy(false);
    if (e || !data || data.length === 0) {
      return setError('Could not save the dish. Make sure you are signed in as the owner.');
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bg p-4 sm:rounded-3xl">
        <h2 className="mb-3 text-xl font-semibold">{f.id ? 'Edit dish' : 'Add dish'}</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="m-name" className="mb-1 block text-sm font-medium">Name</label>
            <input id="m-name" className={input} value={f.name} onChange={set('name')} maxLength={60} />
          </div>
          <div>
            <label htmlFor="m-desc" className="mb-1 block text-sm font-medium">Description</label>
            <input id="m-desc" className={input} value={f.description} onChange={set('description')} maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="m-price" className="mb-1 block text-sm font-medium">Price</label>
              <input id="m-price" type="number" min="0" step="0.5" inputMode="decimal" className={input} value={f.price} onChange={set('price')} />
            </div>
            <div>
              <label htmlFor="m-cat" className="mb-1 block text-sm font-medium">Category</label>
              <input id="m-cat" className={input} value={f.category} onChange={set('category')} maxLength={30} />
            </div>
            <div>
              <label htmlFor="m-tag" className="mb-1 block text-sm font-medium">Tag (optional)</label>
              <input id="m-tag" className={input} value={f.tag} onChange={set('tag')} maxLength={20} placeholder="Popular" />
            </div>
            <div>
              <label htmlFor="m-emoji" className="mb-1 block text-sm font-medium">Emoji</label>
              <input id="m-emoji" className={input} value={f.emoji} onChange={set('emoji')} maxLength={8} />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Existing categories">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setF((p) => ({ ...p, category: c }))}
                  className="rounded-full bg-chip px-3 py-1 text-xs font-semibold"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.is_veg} onChange={flag('is_veg')} />
            Vegetarian
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.available} onChange={flag('available')} />
            Available to order
          </label>
        </div>

        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-xl bg-chip p-3 font-semibold">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 rounded-xl bg-accent p-3 font-semibold text-white disabled:opacity-60">
            {busy ? 'Saving…' : 'Save dish'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data, error: e } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('name');
      if (e) throw e;
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch {
      setError('Could not load the menu.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(m) {
    const { data, error: e } = await supabase
      .from('menu_items')
      .update({ available: !m.available })
      .eq('id', m.id)
      .select();
    setError(e || !data || data.length === 0 ? 'Could not update the dish. Are you signed in as the owner?' : '');
    load();
  }

  async function remove(m) {
    if (!window.confirm(`Delete "${m.name}" from the menu? This cannot be undone.`)) return;
    const { data, error: e } = await supabase.from('menu_items').delete().eq('id', m.id).select();
    setError(e || !data || data.length === 0 ? 'Could not delete the dish.' : '');
    load();
  }

  const q = search.trim().toLowerCase();
  const shown = items.filter((m) => !q || `${m.name ?? ''} ${m.category ?? ''}`.toLowerCase().includes(q));
  const groups = {};
  shown.forEach((m) => {
    const c = m.category || 'Other';
    if (!groups[c]) groups[c] = [];
    groups[c].push(m);
  });
  const categories = [...new Set(items.map((m) => m.category).filter(Boolean))];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dishes or categories"
          aria-label="Search dishes"
          className={`${input} max-w-xs`}
        />
        <span className="text-sm text-muted">{items.length} dishes</span>
        <button onClick={() => { setForm(EMPTY); }} className={`${btn} ml-auto bg-ok text-white`}>
          + Add dish
        </button>
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="py-10 text-center text-muted">Loading menu…</p>}
      {!loading && items.length === 0 && !error && (
        <p className="py-16 text-center text-muted">No dishes yet. Tap “+ Add dish” to create the first one.</p>
      )}

      {Object.keys(groups).map((cat) => (
        <div key={cat} className="mb-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{cat}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {groups[cat].map((m) => (
              <article
                key={m.id}
                className={`flex items-center gap-3 rounded-2xl border border-line bg-card p-3 ${m.available === false ? 'opacity-60' : ''}`}
              >
                <div aria-hidden className="grid h-14 w-14 flex-none place-items-center rounded-xl bg-chip text-3xl">
                  {m.emoji || '🍽️'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${m.is_veg === false ? 'bg-red-700' : 'bg-ok'}`} />
                    {m.name}
                  </div>
                  <div className="text-sm text-muted">{money(m.price ?? 0)}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => toggle(m)}
                    className={`${btn} ${m.available === false ? 'bg-chip text-muted' : 'bg-okbg text-ok'}`}
                  >
                    {m.available === false ? 'Out of stock' : 'In stock'}
                  </button>
                  <div className="flex gap-1.5">
                    <button onClick={() => setForm(toForm(m))} className={`${btn} flex-1 bg-chip`}>Edit</button>
                    <button onClick={() => remove(m)} className={`${btn} bg-chip text-red-600`}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}

      {form && (
        <DishForm
          initial={form}
          categories={categories}
          onCancel={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
    </section>
  );
}