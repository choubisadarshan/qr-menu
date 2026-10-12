'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/config';
import { uploadDishImage } from '@/lib/uploadImage';
import { normalizeOptions } from '@/lib/options';
import OptionsEditor from '@/components/OptionsEditor';

const btn = 'rounded-md px-4 py-1.5 text-sm font-semibold';
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
  image_url: '',
  options: '',
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
    image_url: m.image_url ?? '',
    options: m.options ? JSON.stringify(m.options, null, 2) : '',
  };
}

function DishForm({ initial, categories, onCancel, onSaved }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const flag = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.checked }));

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadDishImage(file);
      setF((p) => ({ ...p, image_url: url }));
    } catch {
      setError('Photo upload failed. Check the storage setup and that you are signed in as the owner.');
    }
    setUploading(false);
  }

  async function save() {
    const price = Number(f.price);
    if (!f.name.trim() || !f.category.trim() || f.price === '' || Number.isNaN(price) || price < 0) {
      return setError('Name, category and a valid price are required.');
    }
    let options = null;
    if (f.options.trim()) {
      try {
        options = JSON.parse(f.options);
      } catch {
        return setError('Customization options: this is not valid JSON.');
      }
      if (!normalizeOptions(options)) {
        return setError('Customization options: add at least one group with a named choice (or clear the options for a normal dish).');
      }
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
      image_url: f.image_url || null,
      options,
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
          <div className="flex items-center gap-3">
            <div className="grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-lg border border-line bg-chip text-4xl">
              {f.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true">{f.emoji || '🍽️'}</span>
              )}
            </div>
            <div className="flex flex-col items-start gap-2">
              <label className="cursor-pointer rounded-md bg-chip px-4 py-2 text-sm font-semibold focus-within:ring-2 focus-within:ring-accent">
                {uploading ? 'Uploading…' : f.image_url ? 'Change photo' : 'Add photo'}
                <input type="file" accept="image/*" onChange={onPhoto} disabled={uploading} className="sr-only" />
              </label>
              {f.image_url && (
                <button type="button" onClick={() => setF((p) => ({ ...p, image_url: '' }))} className="text-sm font-semibold text-red-600">
                  Remove photo
                </button>
              )}
            </div>
          </div>
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
                  className="rounded-md bg-chip px-3 py-1 text-xs font-semibold"
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
          <details className="rounded-md border border-line p-3" open={!!initial.options.trim()}>
            <summary className="cursor-pointer text-sm font-semibold">
              Customization options{f.options.trim() ? ' · set' : ''}
            </summary>
            <OptionsEditor
              value={f.options}
              onChange={(v) => setF((p) => ({ ...p, options: v }))}
              basePrice={f.price}
            />
          </details>
        </div>

        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-xl bg-chip p-3 font-semibold">Cancel</button>
          <button onClick={save} disabled={busy || uploading} className="flex-1 rounded-xl bg-accent p-3 font-semibold text-on-accent disabled:opacity-60">
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
        <button onClick={() => { setForm(EMPTY); }} className={`${btn} ml-auto bg-ok text-on-ok`}>
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groups[cat].map((m) => (
              <article
                key={m.id}
                className={`min-w-0 rounded-2xl border border-line bg-card p-3 ${m.available === false ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-lg bg-chip text-3xl">
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    m.emoji || '🍽️'
                  )}
                </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${m.is_veg === false ? 'bg-red-700' : 'bg-ok'}`} />
                      {m.name}
                    </div>
                    <div className="text-sm text-muted">
                    {m.options ? 'From ' : ''}{money(m.price ?? 0)}
                    {m.options ? ' · Customizable' : ''}
                  </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggle(m)}
                    className={`${btn} flex-1 ${m.available === false ? 'bg-chip text-muted' : 'bg-okbg text-ok'}`}
                  >
                    {m.available === false ? 'Out of stock' : 'In stock'}
                  </button>
                  <button onClick={() => setForm(toForm(m))} className={`${btn} bg-chip`}>Edit</button>
                  <button onClick={() => remove(m)} className={`${btn} bg-chip text-red-600`}>Delete</button>
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