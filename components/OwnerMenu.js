'use client';
import Dropdown from '@/components/Dropdown';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CONFIG, money } from '@/lib/config';
import { uploadDishImage } from '@/lib/uploadImage';
import { normalizeOptions } from '@/lib/options';
import OptionsEditor, { countGroups } from '@/components/OptionsEditor';
import { useScrollLock } from '@/lib/useScrollLock';
import { useDismiss } from '@/lib/useDismiss';
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
  // Click outside / Esc closes the editor (asks first if something was changed)
  const [startSnap] = useState(() => JSON.stringify(initial));
  function requestClose() {
    if (JSON.stringify(f) !== startSnap && !window.confirm('Discard your changes?')) return;
    onCancel();
  }
  const dismiss = useDismiss(requestClose);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  useScrollLock(true);
  const [tab, setTab] = useState('details'); // 'details' | 'custom'
  const [preview, setPreview] = useState(false); // customer preview (inside the Customizations tab)
  const [newCat, setNewCat] = useState(false);

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
      setTab('details');
      setPreview(false);
      return setError('Name, category and a valid price are required.');
    }
    let options = null;
    if (f.options.trim()) {
      try {
        options = JSON.parse(f.options);
      } catch {
        setTab('custom');
        setPreview(false);
        return setError('The dish choices could not be saved. Please check them and try again.');
      }
      if (!normalizeOptions(options)) {
        setTab('custom');
        setPreview(false);
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

  const groupCount = countGroups(f.options);
  const priceOk = f.price !== '' && Number.isFinite(Number(f.price));
  const catIsNew = newCat || (f.category !== '' && !categories.includes(f.category)) || categories.length === 0;
  const fieldBox = 'w-full rounded-lg border border-edge bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 md:text-sm';
  const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-muted';
  const showPreview = tab === 'custom' && preview;

  function openTab(t) {
    setTab(t);
    setPreview(false);
  }

  return (
    <div
      className="scrim anim-scrim fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end"
      {...dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={f.id ? 'Edit dish' : 'Add dish'}
    >
      {/* Mobile: full-width bottom sheet. Desktop: wide side panel. */}
      <div className="anim-sheet flex h-[94dvh] w-full max-w-3xl flex-col overflow-clip rounded-t-3xl border-t border-edge bg-card shadow-sheet lg:h-auto lg:max-w-5xl lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0">
        <div className="flex justify-center pt-2 lg:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        {/* ---------- Header ---------- */}
        <div className="px-4 pt-3 lg:px-8 lg:pt-6">
          <p className={eyebrow}>Menu / {f.id ? 'Edit dish' : 'Add dish'}</p>
          <div className="mt-3 flex items-center gap-3 sm:gap-4">
            <div className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-xl border border-edge bg-chip text-3xl sm:h-16 sm:w-16">
              {f.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true">{f.emoji || '🍽️'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div role="heading" aria-level={2} className="truncate text-xl font-semibold sm:text-2xl">
                {f.name.trim() || (f.id ? 'Untitled dish' : 'New dish')}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${f.is_veg ? 'bg-ok' : 'bg-nonveg'}`} />
                <span>{f.category.trim() || 'No category'}</span>
                {priceOk && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="tabular-nums">{money(f.price)} base price</span>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={onCancel} aria-label="Close" className="grid h-9 w-9 flex-none place-items-center rounded-lg text-muted hover:bg-chip hover:text-ink">
              <Icon name="close" size={18} />
            </button>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-b border-edge">
            <div role="tablist" aria-label="Dish editor sections" className="flex min-w-0 gap-4 sm:gap-6">
              <button
                role="tab"
                aria-selected={tab === 'details'}
                onClick={() => openTab('details')}
                className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${tab === 'details' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`}
              >
                Dish details
              </button>
              <button
                role="tab"
                aria-selected={tab === 'custom'}
                onClick={() => openTab('custom')}
                className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${tab === 'custom' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`}
              >
                Customizations
                <span className="rounded bg-okbg px-1.5 text-xs tabular-nums text-ok">{groupCount}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setTab('custom');
                setPreview(!showPreview);
              }}
              aria-label={showPreview ? 'Back to editor' : 'Customer preview'}
              aria-pressed={showPreview}
              className={`mb-2 inline-flex h-10 w-10 flex-none items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium shadow-card hover:bg-chip sm:w-auto sm:px-3 ${showPreview ? 'border-ok text-ok' : 'border-edge'}`}
            >
              <Icon name="eye" size={16} />
              <span className="hidden sm:inline">{showPreview ? 'Back to editor' : 'Customer preview'}</span>
            </button>
          </div>
        </div>

        {/* ---------- Body (scrolls) ---------- */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Tab 1: Dish details */}
          <div hidden={tab !== 'details'} className="px-4 py-6 lg:px-8 lg:py-8">
            <div className="max-w-xl">
              <p className={eyebrow}>The essentials</p>
              <div role="heading" aria-level={3} className="mt-3 text-3xl font-semibold">Dish details</div>

              <div className="mt-8 space-y-6">
                <div>
                  <label htmlFor="m-name" className="mb-2 block text-sm font-medium">Dish name</label>
                  <input id="m-name" className={fieldBox} value={f.name} onChange={set('name')} maxLength={60} />
                </div>
                <div>
                  <label htmlFor="m-desc" className="mb-2 block text-sm font-medium">Description</label>
                  <textarea id="m-desc" rows={3} className={`${fieldBox} resize-y`} value={f.description} onChange={set('description')} maxLength={120} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="m-price" className="mb-2 block text-sm font-medium">Base price ({CONFIG.currency})</label>
                    <input id="m-price" type="number" min="0" step="0.5" inputMode="decimal" className={`${fieldBox} tabular-nums`} value={f.price} onChange={set('price')} />
                  </div>
                  <div>
                    <label htmlFor="m-cat" className="mb-2 block text-sm font-medium">Category</label>
                    {categories.length > 0 && (
                      <select
                        id="m-cat"
                        className={fieldBox}
                        value={catIsNew ? '__new' : f.category}
                        onChange={(e) => {
                          if (e.target.value === '__new') {
                            setNewCat(true);
                            setF((p) => ({ ...p, category: '' }));
                          } else {
                            setNewCat(false);
                            setF((p) => ({ ...p, category: e.target.value }));
                          }
                        }}
                      >
                        <option value="" disabled>Select a category</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        <option value="__new">+ New category…</option>
                      </select>
                    )}
                    {catIsNew && (
                      <input
                        id={categories.length ? 'm-cat-new' : 'm-cat'}
                        aria-label="New category name"
                        className={`${fieldBox} ${categories.length ? 'mt-2' : ''}`}
                        value={f.category}
                        onChange={set('category')}
                        maxLength={30}
                        placeholder="New category name"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1 border-t border-edge pt-2">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm font-medium">Available to order</span>
                    <Switch checked={f.available} onChange={(v) => setF((p) => ({ ...p, available: v }))} label="Available to order" />
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-edge py-3">
                    <span className="text-sm font-medium">Vegetarian</span>
                    <Switch checked={f.is_veg} onChange={(v) => setF((p) => ({ ...p, is_veg: v }))} label="Vegetarian" />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="m-tag" className="mb-2 block text-sm font-medium">Tag (optional)</label>
                    <input id="m-tag" className={fieldBox} value={f.tag} onChange={set('tag')} maxLength={20} placeholder="Popular" />
                  </div>
                  <div>
                    <label htmlFor="m-emoji" className="mb-2 block text-sm font-medium">Emoji</label>
                    <input id="m-emoji" className={fieldBox} value={f.emoji} onChange={set('emoji')} maxLength={8} />
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium">Photo</span>
                  <div className="flex items-center gap-3">
                    <div className="grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-xl border border-edge bg-chip text-4xl">
                      {f.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden="true">{f.emoji || '🍽️'}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <label className="relative cursor-pointer rounded-lg border border-edge bg-card px-4 py-2 text-sm font-medium shadow-card focus-within:ring-2 focus-within:ring-accent hover:bg-chip">
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
                </div>
              </div>
            </div>
          </div>

          {/* Tab 2: Customizations (kept mounted so nothing is lost when switching tabs) */}
          <div hidden={tab !== 'custom'} className="min-h-full">
            <OptionsEditor
              value={f.options}
              onChange={(v) => setF((p) => ({ ...p, options: v }))}
              basePrice={f.price}
              preview={showPreview}
              dish={{ name: f.name, category: f.category, image_url: f.image_url, emoji: f.emoji }}
            />
          </div>
        </div>

        {error && <p role="alert" className="border-t border-edge bg-warnbg px-4 py-2.5 text-sm font-medium text-red-600 lg:px-8">{error}</p>}

        {/* ---------- Footer ---------- */}
        <div className="safe-bottom flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-edge px-4 pt-3 lg:px-8">
          <p className="flex w-full items-center gap-2 text-xs text-muted sm:mr-auto sm:w-auto">
            <span aria-hidden="true" className="h-1.5 w-1.5 flex-none rounded-full bg-ok" />
            <span>
              Base price <strong className="tabular-nums text-ink">{priceOk ? money(f.price) : '—'}</strong> · Extra prices added to each choice
            </span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            {tab === 'details' && f.id && onDelete && (
              <button type="button" onClick={() => onDelete(f)} aria-label="Delete dish" className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-chip hover:text-red-600">
                <Icon name="trash" size={18} />
              </button>
            )}
            <button type="button" onClick={onCancel} className="rounded-lg border border-edge bg-card px-5 py-2.5 text-sm font-medium shadow-card hover:bg-chip">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card hover:bg-accent-hover disabled:opacity-60"
            >
              <Icon name="save" size={16} />
              {busy ? 'Saving…' : 'Save dish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Right-side drawer with a dish's customization groups and an on/off switch for every choice.
// Slides in from the right (and back out) on phones and desktop alike.
function OptionsDrawer({ dish, options, onToggle, onEdit, onClose }) {
  const [shown, setShown] = useState(false);
  const closing = useRef(false);
  useScrollLock(true);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true)); // next frame, so the slide-in transition runs
    return () => cancelAnimationFrame(id);
  }, []);

  const close = useCallback(
    (after) => {
      if (closing.current) return;
      closing.current = true;
      setShown(false);
      setTimeout(() => {
        onClose();
        if (typeof after === 'function') after();
      }, 300);
    },
    [onClose]
  );
  const dismiss = useDismiss(close);
  const groups = Array.isArray(options?.groups) ? options.groups : [];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-[background-color,backdrop-filter] duration-300 ease-out ${shown ? 'bg-black/40 backdrop-blur-[3px]' : 'bg-black/0'}`}
      {...dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`${dish.name} customizations`}
    >
      <aside
        className={`flex h-full w-full max-w-md flex-col border-l border-edge bg-card shadow-sheet transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start gap-3 border-b border-line px-4 py-4">
          <span aria-hidden="true" className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-xl bg-chip text-2xl">
            {dish.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dish.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              dish.emoji || '🍽️'
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div role="heading" aria-level={2} className="truncate text-lg font-semibold">{dish.name}</div>
            <p className="text-xs text-muted">
              {options?.title || 'Customizations'} · {groups.length} group{groups.length === 1 ? '' : 's'}
            </p>
          </div>
          <button type="button" onClick={() => close()} aria-label="Close" className="grid h-9 w-9 flex-none place-items-center rounded-lg text-muted hover:bg-chip hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <p className="text-xs text-muted">Switch a choice off when it runs out. Customers will not see it.</p>
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{g.label || g.key}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.required !== false ? 'bg-warnbg text-warn' : 'bg-line text-muted'}`}>
                  {g.required !== false ? 'Required' : 'Optional'}
                </span>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-edge bg-card">
                {(g.choices || []).map((c) => {
                  const on = c.available !== false;
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                      {c.icon && <span aria-hidden="true" className="text-lg">{c.icon}</span>}
                      <div className={`min-w-0 flex-1 transition-opacity ${on ? '' : 'opacity-50'}`}>
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        {(c.sub || c.desc) && <div className="truncate text-xs text-muted">{c.sub || c.desc}</div>}
                      </div>
                      <span className={`flex-none text-sm tabular-nums transition-opacity ${on ? '' : 'opacity-50'}`}>
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

        <div className="safe-bottom border-t border-line px-4 pt-3">
          <button type="button" onClick={() => close(onEdit)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-chip px-4 py-2.5 text-sm font-semibold hover:bg-line">
            <Icon name="edit" size={14} /> Edit, add or reorder
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function OwnerMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [optsFor, setOptsFor] = useState(null); // id of the dish whose customizations drawer is open
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

  // Switch ONE customization choice on/off without opening the editor (updates instantly, then saves).
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
    setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, options: next } : x)));
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
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden" role="group" aria-label="Category filter">
          {['all', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`flex-none rounded-full border px-4 py-1.5 text-sm font-semibold ${cat === c ? 'border-accent bg-accent text-on-accent' : 'border-edge bg-card text-muted hover:text-ink'}`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
        {/* Desktop: the categories live in a dropdown (phones keep the chips above) */}
        <div className="hidden flex-none lg:block">
          <Dropdown
            variant="pill"
            align="left"
            value={cat}
            onChange={setCat}
            ariaLabel="Category filter"
            options={[
              { value: 'all', label: 'All', count: items.length },
              ...categories.map((c) => ({ value: c, label: c, count: items.filter((m) => (m.category || 'Other') === c).length })),
            ]}
          />
        </div>
        <SearchBox value={search} onChange={setSearch} placeholder="Search dishes" className="lg:ml-auto lg:w-72" />
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="py-10 text-center text-muted">Loading menu…</p>}
      {!loading && items.length === 0 && !error && (
        <p className="rounded-2xl border border-dashed border-edge py-16 text-center text-muted">
          No dishes yet. Tap “Add item” to create the first one.
        </p>
      )}
      {!loading && items.length > 0 && shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-edge py-12 text-center text-muted">No dishes match.</p>
      )}

      {shown.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-edge bg-card shadow-card">
          {shown.map((m) => {
            const isOn = m.available !== false;
            const opts = typeof m.options === 'string' ? (() => { try { return JSON.parse(m.options); } catch { return null; } })() : m.options;
            const groups = Array.isArray(opts?.groups) ? opts.groups : [];
            return (
              <li key={m.id} className="p-3 sm:p-4">
                {/* Phone: dish on top, then category / price / availability on ONE row, Edit under the switch.
                    Desktop (md+): everything on a single row. */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
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

                  <div className="flex items-center gap-3 md:contents">
                    <div className="min-w-0 flex-1 md:w-28 md:flex-none md:text-center">
                      <span className="inline-block max-w-full truncate rounded-full bg-chip px-3 py-1 align-middle text-xs font-semibold">{m.category || 'Other'}</span>
                    </div>
                    <div className="flex-none whitespace-nowrap text-right font-semibold tabular-nums md:w-24">
                      {groups.length > 0 && <span className="mr-1 text-xs font-normal text-muted">from</span>}
                      {money(m.price ?? 0)}
                    </div>
                    <label className="flex flex-none items-center gap-2 text-sm md:w-36">
                      <Switch checked={isOn} onChange={() => toggle(m)} label={`${m.name} available`} />
                      <span className={`w-[5.25rem] md:w-auto ${isOn ? 'font-semibold text-ok' : 'text-muted'}`}>{isOn ? 'Available' : 'Unavailable'}</span>
                    </label>
                  </div>

                  <button onClick={() => setForm(toForm(m))} className={`${btn} flex min-h-10 flex-none items-center gap-1.5 self-end bg-chip md:min-h-0 md:self-auto`}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                </div>

                {groups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOptsFor(m.id)}
                    aria-haspopup="dialog"
                    className="mt-3 flex w-full items-center gap-2 rounded-xl border border-edge bg-chip/60 px-3 py-2.5 text-left text-sm font-semibold text-accent hover:bg-chip"
                  >
                    <Icon name="sliders" size={16} />
                    <span className="flex-1">Customizations · {groups.length} group{groups.length > 1 ? 's' : ''}</span>
                    <Icon name="chevronRight" size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {optsFor != null && (() => {
        const m = items.find((x) => x.id === optsFor);
        if (!m) return null;
        const o = typeof m.options === 'string' ? (() => { try { return JSON.parse(m.options); } catch { return null; } })() : m.options;
        return (
          <OptionsDrawer
            dish={m}
            options={o}
            onToggle={(gk, cid) => toggleChoice(m, gk, cid)}
            onEdit={() => setForm(toForm(m))}
            onClose={() => setOptsFor(null)}
          />
        );
      })()}

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