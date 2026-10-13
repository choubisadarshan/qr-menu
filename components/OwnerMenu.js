'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/config';
import { uploadDishImage } from '@/lib/uploadImage';
import { normalizeOptions } from '@/lib/options';
import OptionsEditor from '@/components/OptionsEditor';
import { PageHeader, StatCard, SearchBox, Switch, Icon } from '@/components/owner/ui';

const btn = 'rounded-lg px-4 py-1.5 text-sm font-semibold';
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

function DishForm({ initial, categories, onCancel, onSaved, onDelete }) {
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:items-stretch lg:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={f.id ? 'Edit dish' : 'Add dish'}
    >
      {/* Mobile: full-width bottom sheet. Desktop: side panel. */}
      <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-sheet lg:max-h-none lg:max-w-xl lg:rounded-none lg:rounded-l-3xl">
        <div className="flex justify-center pt-2 lg:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3 lg:px-6 lg:pt-5">
          <h2 className="text-xl font-semibold">{f.id ? 'Edit dish' : 'Add item'}</h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg bg-chip">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 lg:px-6">
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

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="safe-bottom flex items-center gap-2 border-t border-line px-4 pt-3 lg:px-6">
          {f.id && onDelete && (
            <button type="button" onClick={() => onDelete(f)} className="rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-chip">
              Delete
            </button>
          )}
          <button onClick={onCancel} className="ml-auto rounded-xl bg-chip px-5 py-3 font-semibold">Cancel</button>
          <button onClick={save} disabled={busy || uploading} className="rounded-xl bg-accent px-6 py-3 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">
            {busy ? 'Saving…' : 'Save dish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Read-only view of a dish's customization options, with an on/off switch for every choice.
function OptionsPanel({ options, onToggle, onEdit }) {
  const groups = Array.isArray(options?.groups) ? options.groups : [];
  return (
    <div className="mt-3 rounded-2xl bg-chip/60 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{options.title || 'Customization options'}</p>
        <button type="button" onClick={onEdit} className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold shadow-card">
          Edit, add or reorder
        </button>
      </div>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{g.label || g.key}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.required !== false ? 'bg-warnbg text-warn' : 'bg-line text-muted'}`}>
                {g.required !== false ? 'Required' : 'Optional'}
              </span>
              <span className="text-[11px] capitalize text-muted">{g.layout || 'list'} layout</span>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
              {(g.choices || []).map((c) => {
                const on = c.available !== false;
                return (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                    {c.icon && <span aria-hidden="true" className="text-lg">{c.icon}</span>}
                    <div className={`min-w-0 flex-1 ${on ? '' : 'opacity-50'}`}>
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      {(c.sub || c.desc) && <div className="truncate text-xs text-muted">{c.sub || c.desc}</div>}
                    </div>
                    <span className={`flex-none text-sm tabular-nums ${on ? '' : 'opacity-50'}`}>
                      {Number(c.price) > 0 ? `+${money(c.price)}` : Number(c.price) < 0 ? `-${money(Math.abs(c.price))}` : 'Free'}
                    </span>
                    <Switch size="sm" checked={on} onChange={() => onToggle(g.key, c.id)} label={`${c.name} available`} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OwnerMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [openOpts, setOpenOpts] = useState(null); // id of the dish whose options are expanded
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

  // Switch ONE customization choice on/off without opening the editor.
  async function toggleChoice(m, groupKey, choiceId) {
    let o = m.options;
    if (typeof o === 'string') {
      try {
        o = JSON.parse(o);
      } catch {
        return;
      }
    }
    const next = {
      ...o,
      groups: o.groups.map((g) =>
        g.key !== groupKey
          ? g
          : { ...g, choices: g.choices.map((c) => (c.id === choiceId ? { ...c, available: c.available === false } : c)) }
      ),
    };
    const { data, error: e } = await supabase.from('menu_items').update({ options: next }).eq('id', m.id).select();
    setError(e || !data || data.length === 0 ? 'Could not update the option. Are you signed in as the owner?' : '');
    load();
  }

  async function remove(m) {
    if (!window.confirm(`Delete "${m.name}" from the menu? This cannot be undone.`)) return false;
    const { data, error: e } = await supabase.from('menu_items').delete().eq('id', m.id).select();
    setError(e || !data || data.length === 0 ? 'Could not delete the dish.' : '');
    load();
    return !e && !!data && data.length > 0;
  }

  const q = search.trim().toLowerCase();
  const categories = [...new Set(items.map((m) => m.category).filter(Boolean))];
  const shown = items.filter(
    (m) =>
      (cat === 'all' || (m.category || 'Other') === cat) &&
      (!q || `${m.name ?? ''} ${m.category ?? ''} ${m.description ?? ''}`.toLowerCase().includes(q))
  );
  const availableCount = items.filter((m) => m.available !== false).length;

  return (
    <section>
      <PageHeader title="Menu" subtitle="Good food, great coffee. All in one place.">
        <button
          onClick={() => setForm(EMPTY)}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
        >
          <Icon name="plus" size={16} /> Add item
        </button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total items" value={items.length} />
        <StatCard label="Available" value={availableCount} />
        <StatCard label="Unavailable" value={items.length - availableCount} />
        <StatCard label="Categories" value={categories.length} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Category filter">
          {['all', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`flex-none rounded-full border px-4 py-1.5 text-sm font-semibold ${cat === c ? 'border-accent bg-accent text-on-accent' : 'border-line bg-card text-muted hover:text-ink'}`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
        <SearchBox value={search} onChange={setSearch} placeholder="Search dishes" className="lg:ml-auto lg:w-72" />
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="py-10 text-center text-muted">Loading menu…</p>}
      {!loading && items.length === 0 && !error && (
        <p className="rounded-2xl border border-dashed border-line py-16 text-center text-muted">
          No dishes yet. Tap “Add item” to create the first one.
        </p>
      )}
      {!loading && items.length > 0 && shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-muted">No dishes match.</p>
      )}

      {shown.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-card">
          {shown.map((m) => {
            const isOn = m.available !== false;
            const opts = typeof m.options === 'string' ? (() => { try { return JSON.parse(m.options); } catch { return null; } })() : m.options;
            const groups = Array.isArray(opts?.groups) ? opts.groups : [];
            const expanded = openOpts === m.id;
            return (
              <li key={m.id} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:flex-nowrap">
                  <div className="flex min-w-0 flex-1 items-center gap-3 basis-full md:basis-auto">
                    <div aria-hidden="true" className={`grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-xl bg-chip text-3xl ${isOn ? '' : 'opacity-50'}`}>
                      {m.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        m.emoji || '🍽️'
                      )}
                    </div>
                    <div className={`min-w-0 ${isOn ? '' : 'opacity-60'}`}>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className={`inline-block h-2.5 w-2.5 flex-none rounded-full ${m.is_veg === false ? 'bg-nonveg' : 'bg-ok'}`} title={m.is_veg === false ? 'Non-veg' : 'Veg'} />
                        <span className="truncate">{m.name}</span>
                        {m.tag && <span className="flex-none rounded-full bg-warnbg px-2 py-0.5 text-[11px] font-semibold text-warn">{m.tag}</span>}
                      </div>
                      {m.description && <div className="truncate text-sm text-muted">{m.description}</div>}
                    </div>
                  </div>

                  <span className="rounded-full bg-chip px-3 py-1 text-xs font-semibold md:w-28 md:flex-none md:text-center">
                    <span className="block truncate">{m.category || 'Other'}</span>
                  </span>
                  <div className="w-24 flex-none font-semibold tabular-nums md:text-right">
                    {groups.length > 0 && <span className="mr-1 text-xs font-normal text-muted">from</span>}
                    {money(m.price ?? 0)}
                  </div>
                  <label className="ml-auto flex flex-none items-center gap-2 text-sm md:ml-0 md:w-36">
                    <Switch checked={isOn} onChange={() => toggle(m)} label={`${m.name} available`} />
                    <span className={isOn ? 'font-semibold text-ok' : 'text-muted'}>{isOn ? 'Available' : 'Unavailable'}</span>
                  </label>
                  <button onClick={() => setForm(toForm(m))} className={`${btn} flex flex-none items-center gap-1.5 bg-chip`}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                </div>

                {groups.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenOpts(expanded ? null : m.id)}
                      aria-expanded={expanded}
                      className="mt-3 flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-accent"
                    >
                      <Icon name="sliders" size={16} />
                      Customizations · {groups.length} group{groups.length > 1 ? 's' : ''}
                      <Icon name="chevronDown" size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <OptionsPanel options={opts} onToggle={(gk, cid) => toggleChoice(m, gk, cid)} onEdit={() => setForm(toForm(m))} />
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {form && (
        <DishForm
          initial={form}
          categories={categories}
          onCancel={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
          onDelete={async (f) => {
            if (await remove(f)) setForm(null);
          }}
        />
      )}
    </section>
  );
}