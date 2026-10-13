'use client';
import { useState } from 'react';
import { money } from '@/lib/config';
import { Switch } from '@/components/owner/ui';

/**
 * Form editor for menu_items.options (customization options).
 * It reads and writes the SAME JSON the customer screen already uses (see lib/options.js):
 *   { title, hint, groups: [{ key, label, required, layout, choices: [{ id, name, price, sub, desc, icon, diet }] }] }
 * A choice can be switched off (available:false): it stays saved but customers do not see it.
 * Props:
 *   value     JSON string ('' = normal dish, no customization)
 *   onChange  called with the new JSON string ('' when there are no groups)
 *   basePrice the dish price (only used for the price-range preview)
 *
 * Which fields the customer screen actually shows, per layout:
 *   list  → name, price
 *   grid  → name, sub-label, price
 *   cards → icon, veg / non-veg, name, description, price   (works only as the FIRST group = "Step 1")
 */

const box = 'w-full rounded-md bg-chip px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-accent';
const tiny = 'rounded-md bg-chip px-2.5 py-1 text-xs font-semibold disabled:opacity-40';

const LAYOUTS = [
  { value: 'list', label: 'List', help: 'A simple list. Good for crust, extras, spice level.' },
  { value: 'grid', label: 'Grid', help: 'Compact tiles with a small sub-label. Good for sizes.' },
  { value: 'cards', label: 'Cards', help: 'Big cards with icon and description. Use it as the FIRST group: customers pick it as step 1.' },
];

/* ---------- model <-> JSON ---------- */

const uid = () => Math.random().toString(36).slice(2, 8);
const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

const newChoice = (name = '', price = '') => ({
  _k: uid(), _auto: true, id: '', name, sub: '', desc: '', icon: '', diet: 'veg', price, available: true,
});
const newGroup = (label = '', layout = 'list', required = true, choices = [newChoice()]) => ({
  _k: uid(), _auto: true, key: '', label, required, layout, choices,
});
const emptyModel = () => ({ title: '', hint: '', groups: [] });

const TEMPLATES = [
  { id: 'size', label: 'Size', make: () => newGroup('Choose Size', 'grid', true, [newChoice('Regular', '0'), newChoice('Medium', ''), newChoice('Large', '')]) },
  { id: 'variety', label: 'Variety (cards)', make: () => newGroup('Choose your Dish', 'cards', true, [newChoice('', '0')]) },
  { id: 'extras', label: 'Optional extras', make: () => newGroup('Extras', 'list', false, [newChoice('', '')]) },
  { id: 'blank', label: 'Blank group', make: () => newGroup() },
];

// JSON text -> editor model. Returns { model } or { error }.
function fromJson(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return { error: 'This is not valid JSON.' };
  }
  if (!o || typeof o !== 'object' || !Array.isArray(o.groups)) {
    return { error: 'Needs a "groups" list, each group with a "key" and "choices".' };
  }
  const groups = o.groups
    .filter((g) => g && typeof g === 'object')
    .map((g) => ({
      _k: uid(),
      _auto: !g.key,
      key: String(g.key ?? ''),
      label: String(g.label ?? g.key ?? ''),
      required: g.required !== false,
      layout: g.layout === 'cards' || g.layout === 'grid' ? g.layout : 'list',
      choices: (Array.isArray(g.choices) ? g.choices : [])
        .filter((c) => c && typeof c === 'object')
        .map((c) => ({
          _k: uid(),
          _auto: !c.id,
          id: String(c.id ?? ''),
          name: String(c.name ?? ''),
          sub: String(c.sub ?? ''),
          desc: String(c.desc ?? ''),
          icon: String(c.icon ?? ''),
          diet: c.diet === 'non-veg' ? 'non-veg' : 'veg',
          price: c.price == null ? '' : String(c.price),
          available: c.available !== false,
        })),
    }));
  return { model: { title: String(o.title ?? ''), hint: String(o.hint ?? ''), groups } };
}

// A unique id/key. Saved ones never change; new ones are made from the name.
function uniqueId(wanted, taken, fallback) {
  const base = wanted || fallback;
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}

// Editor model -> JSON text ('' when nothing is set). Unfinished rows (no name) are left out.
function serialize(m) {
  const keys = new Set();
  const groups = [];
  for (const g of m.groups) {
    const named = g.choices.filter((c) => c.name.trim());
    if (!named.length) continue;
    const ids = new Set();
    groups.push({
      key: uniqueId(g._auto ? slug(g.label) : g.key, keys, 'group'),
      label: g.label.trim() || 'Options',
      required: g.required,
      layout: g.layout,
      choices: named.map((c) => {
        const out = {
          id: uniqueId(c._auto ? slug(c.name) : c.id, ids, 'choice'),
          name: c.name.trim(),
          price: Number(c.price) || 0,
        };
        if (!c.available) out.available = false; // switched off: hidden from customers
        if (g.layout === 'grid' && c.sub.trim()) out.sub = c.sub.trim();
        if (g.layout === 'cards') {
          if (c.desc.trim()) out.desc = c.desc.trim();
          if (c.icon.trim()) out.icon = c.icon.trim();
          out.diet = c.diet;
        }
        return out;
      }),
    });
  }
  if (!groups.length) return '';
  const out = {};
  if (m.title.trim()) out.title = m.title.trim();
  if (m.hint.trim()) out.hint = m.hint.trim();
  out.groups = groups;
  return JSON.stringify(out, null, 2);
}

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const a = [...arr];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};

/* ---------- small pieces ---------- */

function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex rounded-md bg-chip p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded px-3 py-1 text-xs font-semibold ${value === o.value ? 'bg-accent text-on-accent' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function priceRange(m, base) {
  const b = Number(base);
  if (!Number.isFinite(b)) return null;
  let lo = b;
  let hi = b;
  let any = false;
  for (const g of m.groups) {
    const prices = g.choices.filter((c) => c.name.trim()).map((c) => Number(c.price) || 0);
    if (!prices.length) continue;
    any = true;
    const opt = g.required ? [] : [0];
    lo += Math.min(...prices, ...opt);
    hi += Math.max(...prices, ...opt);
  }
  return any ? { lo: Math.max(0, lo), hi: Math.max(0, hi) } : null;
}

/* ---------- the editor ---------- */

export default function OptionsEditor({ value, onChange, basePrice }) {
  const [mode, setMode] = useState(() => (value.trim() && fromJson(value).error ? 'json' : 'form'));
  const [model, setModel] = useState(() => (value.trim() ? fromJson(value).model || emptyModel() : emptyModel()));
  const [raw, setRaw] = useState(value);
  const [jsonError, setJsonError] = useState('');

  const commit = (next) => {
    setModel(next);
    onChange(serialize(next));
  };
  const setGroups = (groups) => commit({ ...model, groups });
  const upGroup = (gi, patch) => setGroups(model.groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const upChoices = (gi, fn) => upGroup(gi, { choices: fn(model.groups[gi].choices) });
  const upChoice = (gi, ci, patch) => upChoices(gi, (cs) => cs.map((c, j) => (j === ci ? { ...c, ...patch } : c)));

  function toJson() {
    setRaw(serialize(model));
    setJsonError('');
    setMode('json');
  }
  function toForm() {
    if (!raw.trim()) {
      setModel(emptyModel());
      onChange('');
      setJsonError('');
      return setMode('form');
    }
    const r = fromJson(raw);
    if (r.error) return setJsonError(r.error);
    setModel(r.model);
    onChange(serialize(r.model));
    setJsonError('');
    setMode('form');
  }

  const range = priceRange(model, basePrice);
  const skipped = model.groups.filter((g) => !g.choices.some((c) => c.name.trim()));

  /* ----- JSON mode ----- */
  if (mode === 'json') {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">Advanced: edit the raw JSON. Leave empty for a normal dish.</p>
          <button type="button" onClick={toForm} className={tiny}>← Back to form</button>
        </div>
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setJsonError('');
            onChange(e.target.value);
          }}
          rows={12}
          spellCheck={false}
          aria-label="Customization options as JSON"
          className={`${box} font-mono text-xs`}
        />
        {jsonError && <p role="alert" className="text-xs text-red-600">{jsonError}</p>}
      </div>
    );
  }

  /* ----- form mode ----- */
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">
          For dishes with choices such as size, crust or variety. Each choice can add to the price. Leave empty for a normal dish.
        </p>
        <button type="button" onClick={toJson} className={`${tiny} flex-none`}>Edit as JSON</button>
      </div>

      {model.groups.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Popup title (optional)">
            <input className={box} value={model.title} maxLength={60} placeholder="Customize Artisanal Pasta"
              onChange={(e) => commit({ ...model, title: e.target.value })} />
          </Field>
          <Field label="Short hint (optional)">
            <input className={box} value={model.hint} maxLength={80} placeholder="4 sauces • Penne / Spaghetti"
              onChange={(e) => commit({ ...model, hint: e.target.value })} />
          </Field>
        </div>
      )}

      {model.groups.map((g, gi) => {
        const layout = LAYOUTS.find((l) => l.value === g.layout);
        return (
          <fieldset key={g._k} className="space-y-2 rounded-md border border-line p-2.5">
            <legend className="px-1 text-xs font-semibold text-muted">Group {gi + 1}</legend>

            <div className="flex items-end gap-2">
              <Field label="Group name" className="flex-1">
                <input className={box} value={g.label} maxLength={60} placeholder="e.g. Choose Size"
                  onChange={(e) => upGroup(gi, { label: e.target.value })} />
              </Field>
              <button type="button" aria-label={`Move group ${gi + 1} up`} disabled={gi === 0} className={tiny}
                onClick={() => setGroups(move(model.groups, gi, -1))}>↑</button>
              <button type="button" aria-label={`Move group ${gi + 1} down`} disabled={gi === model.groups.length - 1} className={tiny}
                onClick={() => setGroups(move(model.groups, gi, 1))}>↓</button>
              <button type="button" aria-label={`Delete group ${gi + 1}`} className={`${tiny} text-red-600`}
                onClick={() => {
                  if (g.choices.some((c) => c.name.trim()) && !window.confirm(`Delete the group "${g.label || gi + 1}" and its choices?`)) return;
                  setGroups(model.groups.filter((_, i) => i !== gi));
                }}>✕</button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Segmented ariaLabel="Layout" value={g.layout} onChange={(v) => upGroup(gi, { layout: v })} options={LAYOUTS} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={g.required} onChange={(e) => upGroup(gi, { required: e.target.checked })} />
                Required
              </label>
            </div>
            <p className="text-[11px] text-muted">{layout.help}</p>
            {g.layout === 'cards' && gi !== 0 && (
              <p role="status" className="text-[11px] font-semibold text-accent">
                Cards only work as the first group. Move this group to the top, or it will show as a plain list.
              </p>
            )}

            <div className="space-y-2">
              {g.choices.map((c, ci) => (
                <div key={c._k} className="space-y-2 rounded-md border border-line bg-card p-2">
                  <div className="flex gap-2">
                    {g.layout === 'cards' && (
                      <Field label="Icon" className="w-14 flex-none">
                        <input className={`${box} text-center`} value={c.icon} maxLength={8} placeholder="🍕"
                          onChange={(e) => upChoice(gi, ci, { icon: e.target.value })} />
                      </Field>
                    )}
                    <Field label="Choice name" className="min-w-0 flex-1">
                      <input className={box} value={c.name} maxLength={60}
                        placeholder={g.layout === 'grid' ? 'Regular' : g.layout === 'cards' ? 'Margherita Classica' : 'Thin crust'}
                        onChange={(e) => upChoice(gi, ci, { name: e.target.value })} />
                    </Field>
                    <Field label="Extra price" className="w-24 flex-none">
                      <input type="number" step="0.5" inputMode="decimal" className={box} value={c.price} placeholder="0"
                        onChange={(e) => upChoice(gi, ci, { price: e.target.value })} />
                    </Field>
                  </div>

                  {g.layout === 'grid' && (
                    <Field label="Sub-label (optional)">
                      <input className={box} value={c.sub} maxLength={60} placeholder={'7" • Serves 1'}
                        onChange={(e) => upChoice(gi, ci, { sub: e.target.value })} />
                    </Field>
                  )}
                  {g.layout === 'cards' && (
                    <Field label="Description (optional)">
                      <input className={box} value={c.desc} maxLength={160} placeholder="Tomato, basil, fresh mozzarella"
                        onChange={(e) => upChoice(gi, ci, { desc: e.target.value })} />
                    </Field>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {g.layout === 'cards' ? (
                      <Segmented ariaLabel="Veg or non-veg" value={c.diet} onChange={(v) => upChoice(gi, ci, { diet: v })}
                        options={[{ value: 'veg', label: 'Veg' }, { value: 'non-veg', label: 'Non-veg' }]} />
                    ) : (
                      <span />
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="mr-1 flex items-center gap-2 text-xs font-semibold text-muted">
                        <Switch size="sm" checked={c.available} onChange={(v) => upChoice(gi, ci, { available: v })} label="Choice available" />
                        {c.available ? 'On' : 'Off'}
                      </label>
                      <button type="button" aria-label="Move choice up" disabled={ci === 0} className={tiny}
                        onClick={() => upChoices(gi, (cs) => move(cs, ci, -1))}>↑</button>
                      <button type="button" aria-label="Move choice down" disabled={ci === g.choices.length - 1} className={tiny}
                        onClick={() => upChoices(gi, (cs) => move(cs, ci, 1))}>↓</button>
                      <button type="button" aria-label="Remove choice" className={`${tiny} text-red-600`}
                        onClick={() => upChoices(gi, (cs) => cs.filter((_, j) => j !== ci))}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className={tiny}
                onClick={() => upChoices(gi, (cs) => [...cs, newChoice('', g.layout === 'cards' ? '0' : '')])}>
                + Add choice
              </button>
            </div>
          </fieldset>
        );
      })}

      {skipped.length > 0 && (
        <p role="status" className="text-xs font-semibold text-accent">
          {skipped.map((g) => `"${g.label || 'Untitled'}"`).join(', ')} has no named choices yet, so it will not be saved.
        </p>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">
          {model.groups.length ? 'Add another group' : 'Start with a group'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" className={tiny} onClick={() => setGroups([...model.groups, t.make()])}>
              + {t.label}
            </button>
          ))}
        </div>
      </div>

      {range && (
        <p className="rounded-md bg-chip p-2 text-xs">
          Customers will pay <strong>{money(range.lo)}</strong>
          {range.hi !== range.lo && <> to <strong>{money(range.hi)}</strong></>} (dish price plus the selected choices).
        </p>
      )}
    </div>
  );
}