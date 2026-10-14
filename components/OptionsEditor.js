'use client';
import { useRef, useState } from 'react';
import { CONFIG, money } from '@/lib/config';
import { Icon, Switch } from '@/components/owner/ui';

/**
 * "Customizations" tab of the Edit dish panel (two columns: option groups on the left, the selected group on the right)
 * plus the "Customer preview" screen.
 * It reads and writes the SAME JSON the customer screen already uses (see lib/options.js):
 *   { title, hint, groups: [{ key, label, required, layout, choices: [{ id, name, price, sub, desc, icon, diet, available }] }] }
 * Props:
 *   value     JSON string ('' = normal dish, no customization)
 *   onChange  called with the new JSON string ('' when there are no groups)
 *   basePrice the dish price (shown in the sidebar card)
 *   dish      { name, category, image_url, emoji } for the sidebar card and the preview heading
 *   preview   true = show the customer preview instead of the editor
 */

const LAYOUTS = [
  { value: 'list', label: 'List', icon: 'list', help: 'List' },
  { value: 'grid', label: 'Grid', icon: 'grid', help: 'Grid' },
  { value: 'cards', label: 'Cards', icon: 'layers', help: 'Cards' },
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
  { id: 'size', label: 'Size (Regular / Medium / Large)', make: () => newGroup('Pick a size', 'grid', true, [newChoice('Regular', '0'), newChoice('Medium', ''), newChoice('Large', '')]) },
  { id: 'variety', label: 'Variety (cards)', make: () => newGroup('Choose your dish', 'cards', true, [newChoice('', '0')]) },
  { id: 'extras', label: 'Optional extras', make: () => newGroup('Extras', 'list', false, [newChoice('', '')]) },
  { id: 'blank', label: 'Blank group', make: () => newGroup() },
];

function fromJson(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || !Array.isArray(o.groups)) return null;
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
  return { title: String(o.title ?? ''), hint: String(o.hint ?? ''), groups };
}

// How many option groups are saved in a JSON string (used for the tab badge).
export function countGroups(value) {
  const m = value && value.trim() ? fromJson(value) : null;
  return m ? m.groups.filter((g) => g.choices.some((c) => c.name.trim())).length : 0;
}

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
        if (!c.available) out.available = false;
        if (c.sub.trim()) out.sub = c.sub.trim();
        if (c.desc.trim()) out.desc = c.desc.trim();
        if (c.icon.trim()) out.icon = c.icon.trim();
        out.diet = c.diet;
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

const reorder = (arr, from, to) => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
};

/* ---------- shared classes ---------- */

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-muted';
const fieldBox = 'w-full rounded-lg border border-line bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 md:text-sm';
const iconBtn = 'grid h-9 w-9 flex-none place-items-center rounded-lg text-muted transition-colors hover:bg-chip hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent';
const ROW_GRID = 'grid grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_6rem_2.75rem_1.75rem] items-center gap-2 sm:grid-cols-[1.25rem_2.75rem_minmax(0,1fr)_7.5rem_3rem_2rem] sm:gap-3';

const priceLabel = (p) => {
  const n = Number(p) || 0;
  return n === 0 ? 'Included' : `${n > 0 ? '+' : '−'}${money(Math.abs(n))}`;
};

/* ---------- the editor ---------- */

export default function OptionsEditor({ value, onChange, basePrice, dish = {}, preview = false }) {
  const [model, setModel] = useState(() => (value.trim() ? fromJson(value) || emptyModel() : emptyModel()));
  const [selK, setSelK] = useState(null);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState({}); // expanded choice rows
  const dragFrom = useRef(null);

  const commit = (next) => {
    setModel(next);
    onChange(serialize(next));
  };
  const setGroups = (groups) => commit({ ...model, groups });
  const upGroup = (gi, patch) => setGroups(model.groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const upChoices = (gi, fn) => upGroup(gi, { choices: fn(model.groups[gi].choices) });
  const upChoice = (gi, ci, patch) => upChoices(gi, (cs) => cs.map((c, j) => (j === ci ? { ...c, ...patch } : c)));

  const found = model.groups.findIndex((g) => g._k === selK);
  const gi = found >= 0 ? found : 0;
  const g = model.groups[gi];
  const totalChoices = model.groups.reduce((a, x) => a + x.choices.length, 0);

  function addGroup(t) {
    const ng = t.make();
    setGroups([...model.groups, ng]);
    setSelK(ng._k);
    setAdding(false);
  }

  function removeGroup() {
    if (g.choices.some((c) => c.name.trim()) && !window.confirm(`Delete the group "${g.label || 'Untitled group'}" and all its choices?`)) return;
    const next = model.groups.filter((_, i) => i !== gi);
    setGroups(next);
    setSelK(next[Math.max(0, gi - 1)]?._k ?? null);
  }

  function moveGroup(d) {
    const to = gi + d;
    if (to < 0 || to >= model.groups.length) return;
    setGroups(reorder(model.groups, gi, to));
  }

  if (preview) return <CustomerPreview model={model} dish={dish} />;

  return (
    <div className="grid min-h-full md:grid-cols-[17.5rem_minmax(0,1fr)]">
      {/* ---------- Left: option groups ---------- */}
      <aside className="border-b border-line bg-chip/40 p-4 md:border-b-0 md:border-r md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className={eyebrow}>Option groups</span>
          <span className="text-xs tabular-nums text-muted">{model.groups.length}</span>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-col md:overflow-visible md:pb-0">
          {model.groups.map((x, i) => {
            const active = i === gi;
            return (
              <button
                key={x._k}
                type="button"
                onClick={() => setSelK(x._k)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-52 flex-none items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors md:w-auto ${
                  active ? 'border-ok/40 bg-okbg' : 'border-transparent hover:bg-chip'
                }`}
              >
                <span className="text-xs tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{x.label || 'Untitled group'}</span>
                  <span className="block text-[11px] text-muted">
                    {x.choices.length} choice{x.choices.length === 1 ? '' : 's'} · {x.required ? 'Required' : 'Optional'}
                  </span>
                </span>
                <Icon name="chevronRight" size={14} className="text-muted" />
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-card/60 py-3 text-sm font-medium transition-colors hover:bg-card"
          >
            <Icon name="plus" size={16} /> Add option group
          </button>
          {adding && (
            <div className="mt-2 space-y-1 rounded-xl border border-line bg-card p-1.5 shadow-card">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => addGroup(t)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-chip">
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-ok">
          <Icon name="layers" size={14} />
          {totalChoices} choice{totalChoices === 1 ? '' : 's'} across {model.groups.length} group{model.groups.length === 1 ? '' : 's'}
        </p>

        <div className="mt-5 hidden border-t border-line pt-5 md:block">
          <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-chip text-5xl">
            {dish.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dish.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">{dish.emoji || '🍽️'}</span>
            )}
          </div>
          <p className="mt-3 text-[11px] text-muted">{dish.category || 'No category'}</p>
          <p className="text-sm font-bold">{dish.name || 'Untitled dish'}</p>
          {basePrice !== '' && Number.isFinite(Number(basePrice)) && (
            <p className="mt-0.5 text-sm font-medium text-ok tabular-nums">From {money(basePrice)}</p>
          )}
        </div>
      </aside>

      {/* ---------- Right: the selected group ---------- */}
      <section className="min-w-0 p-4 sm:p-6 md:p-8">
        {!g ? (
          <div className="mx-auto max-w-md py-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-okbg text-ok">
              <Icon name="sliders" size={24} />
            </span>
            <div role="heading" aria-level={3} className="mt-4 text-xl font-semibold">No customizations yet</div>
            <p className="mt-2 text-sm text-muted">
              Add a group only if customers must choose something, like a size or a crust. For a normal dish with one price, leave this empty.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => addGroup(t)} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium shadow-card hover:bg-chip">
                  + {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={eyebrow}>Group {String(gi + 1).padStart(2, '0')}</p>
                <div role="heading" aria-level={3} className="mt-3 break-words text-2xl font-semibold sm:text-3xl">{g.label || 'Untitled group'}</div>
                <p className="mt-2 text-xs text-muted">
                  {g.choices.length} choice{g.choices.length === 1 ? '' : 's'} <span className="mx-1">·</span> Customers choose one
                </p>
              </div>
              <div className="flex flex-none items-center">
                <button type="button" aria-label="Move group up" disabled={gi === 0} onClick={() => moveGroup(-1)} className={iconBtn}><Icon name="arrowUp" size={16} /></button>
                <button type="button" aria-label="Move group down" disabled={gi === model.groups.length - 1} onClick={() => moveGroup(1)} className={iconBtn}><Icon name="arrowDown" size={16} /></button>
                <button type="button" aria-label="Delete group" onClick={removeGroup} className={`${iconBtn} hover:text-red-600`}><Icon name="trash" size={16} /></button>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="g-name" className="mb-1.5 block text-sm font-medium">Group name</label>
              <input id="g-name" className={fieldBox} value={g.label} maxLength={60} placeholder="e.g. Pick a size" onChange={(e) => upGroup(gi, { label: e.target.value })} />
            </div>

            <div className="mt-5 grid items-center gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="g-sel" className="mb-1.5 block text-sm font-medium">Selection</label>
                <select id="g-sel" className={fieldBox} value="one" onChange={() => {}}>
                  <option value="one">Choose one</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-4 sm:pt-5">
                <div>
                  <div className="text-sm font-medium">Required group</div>
                  <div className="text-[11px] text-muted">A choice must be selected</div>
                </div>
                <Switch checked={g.required} onChange={(v) => upGroup(gi, { required: v })} label="Required group" />
              </div>
            </div>

            <div className="mt-7 border-t border-line pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold">Choices</span>
                  <span className="text-xs tabular-nums text-muted">{g.choices.length}</span>
                </div>
                <div role="group" aria-label="Layout" className="inline-flex rounded-lg border border-line bg-card p-0.5">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      aria-pressed={g.layout === l.value}
                      onClick={() => upGroup(gi, { layout: l.value })}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${g.layout === l.value ? 'bg-okbg text-ok' : 'text-muted hover:text-ink'}`}
                    >
                      <Icon name={l.icon} size={14} /> {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${ROW_GRID} mt-5 px-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted`}>
                <span className="col-span-2" />
                <span>Choice name</span>
                <span>Extra price</span>
                <span>On</span>
                <span />
              </div>

              <ul className="mt-2 border-t border-line">
                {g.choices.map((c, ci) => {
                  const isOpen = !!open[c._k];
                  return (
                    <li
                      key={c._k}
                      data-row
                      className="border-b border-line"
                      onDragOver={(e) => dragFrom.current !== null && e.preventDefault()}
                      onDrop={() => {
                        const from = dragFrom.current;
                        dragFrom.current = null;
                        if (from !== null) upChoices(gi, (cs) => reorder(cs, from, ci));
                      }}
                    >
                      <div className={`${ROW_GRID} py-3`}>
                        <span
                          draggable
                          aria-hidden="true"
                          title="Drag to reorder"
                          onDragStart={(e) => {
                            dragFrom.current = ci;
                            e.dataTransfer.effectAllowed = 'move';
                            const row = e.currentTarget.closest('[data-row]');
                            if (row) e.dataTransfer.setDragImage(row, 16, 16);
                          }}
                          onDragEnd={() => (dragFrom.current = null)}
                          className="cursor-grab text-line active:cursor-grabbing"
                        >
                          <Icon name="grip" size={16} />
                        </span>
                        <input
                          aria-label="Choice icon (emoji)"
                          className="h-10 w-full rounded-lg bg-okbg/70 text-center text-xl outline-none placeholder:text-muted/50 focus:ring-2 focus:ring-accent/40 sm:h-11"
                          value={c.icon}
                          maxLength={8}
                          placeholder="🙂"
                          onChange={(e) => upChoice(gi, ci, { icon: e.target.value })}
                        />
                        <input
                          aria-label="Choice name"
                          className={`min-w-0 rounded-md bg-transparent px-1.5 py-2 text-base font-medium outline-none hover:bg-chip focus:bg-chip focus:ring-2 focus:ring-accent/40 md:text-sm ${c.available ? '' : 'opacity-50'}`}
                          value={c.name}
                          maxLength={60}
                          placeholder={g.layout === 'grid' ? 'Regular' : g.layout === 'cards' ? 'Classic Margherita' : 'Hand-tossed'}
                          onChange={(e) => upChoice(gi, ci, { name: e.target.value })}
                        />
                        <div className="relative">
                          <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">{CONFIG.currency}</span>
                          <input
                            aria-label="Extra price"
                            type="number"
                            step="0.5"
                            inputMode="decimal"
                            className="w-full rounded-lg border border-line bg-card py-2 pl-6 pr-1.5 text-base tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 md:text-sm"
                            value={c.price}
                            placeholder="0"
                            onChange={(e) => upChoice(gi, ci, { price: e.target.value })}
                          />
                        </div>
                        <Switch checked={c.available} onChange={(v) => upChoice(gi, ci, { available: v })} label={`Show ${c.name || 'this choice'} to customers`} />
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? 'Hide choice details' : 'Show choice details'}
                          onClick={() => setOpen((o) => ({ ...o, [c._k]: !o[c._k] }))}
                          className="grid h-8 w-7 place-items-center text-muted sm:w-8"
                        >
                          <Icon name="chevronDown" size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="mb-3 ml-0 space-y-3 rounded-xl bg-chip/50 p-3 sm:ml-8">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-muted">Small note under the name (tiles)</label>
                              <input className={fieldBox} value={c.sub} maxLength={60} placeholder={'7" • Serves 1'} onChange={(e) => upChoice(gi, ci, { sub: e.target.value })} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-muted">Description (cards)</label>
                              <input className={fieldBox} value={c.desc} maxLength={160} placeholder="Fresh mozzarella, tomato & basil" onChange={(e) => upChoice(gi, ci, { desc: e.target.value })} />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div role="group" aria-label="Veg or non-veg" className="inline-flex rounded-lg border border-line bg-card p-0.5">
                              {[['veg', 'Veg'], ['non-veg', 'Non-veg']].map(([v, label]) => (
                                <button key={v} type="button" aria-pressed={c.diet === v} onClick={() => upChoice(gi, ci, { diet: v })}
                                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${c.diet === v ? 'bg-okbg text-ok' : 'text-muted'}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center">
                              <button type="button" aria-label="Move choice up" disabled={ci === 0} onClick={() => upChoices(gi, (cs) => reorder(cs, ci, ci - 1))} className={iconBtn}><Icon name="arrowUp" size={16} /></button>
                              <button type="button" aria-label="Move choice down" disabled={ci === g.choices.length - 1} onClick={() => upChoices(gi, (cs) => reorder(cs, ci, ci + 1))} className={iconBtn}><Icon name="arrowDown" size={16} /></button>
                              <button type="button" onClick={() => upChoices(gi, (cs) => cs.filter((_, j) => j !== ci))} className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-red-600 hover:bg-chip">
                                <Icon name="trash" size={14} /> Remove choice
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => upChoices(gi, (cs) => [...cs, newChoice('', '')])}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium shadow-card hover:bg-chip"
              >
                <Icon name="plus" size={16} /> Add choice
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
              <span className="flex flex-wrap items-center gap-x-2">
                <Icon name="eye" size={16} className="mr-1" />
                {LAYOUTS.find((l) => l.value === g.layout).label} view <span>·</span> {g.required ? 'Required' : 'Optional'} <span>·</span> One selection
              </span>
              <Icon name="check" size={16} className="text-ok" />
            </div>

            <details className="mt-5 rounded-xl border border-line p-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted">Popup heading shown to customers (optional)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Heading</label>
                  <input className={fieldBox} value={model.title} maxLength={60} placeholder="Craft your pizza" onChange={(e) => commit({ ...model, title: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Small line under the heading</label>
                  <input className={fieldBox} value={model.hint} maxLength={80} placeholder="5 varieties • Hand-tossed crust" onChange={(e) => commit({ ...model, hint: e.target.value })} />
                </div>
              </div>
            </details>
          </>
        )}
      </section>
    </div>
  );
}

/* ---------- Customer preview ---------- */

function CustomerPreview({ model, dish }) {
  const [picks, setPicks] = useState({}); // groupKey -> choiceKey | null
  const groups = model.groups
    .map((g) => ({ ...g, choices: g.choices.filter((c) => c.name.trim() && c.available) }))
    .filter((g) => g.choices.length);

  const picked = (g) => (picks[g._k] === undefined ? (g.required ? g.choices[0]._k : null) : picks[g._k]);
  const pick = (g, c) => setPicks((p) => ({ ...p, [g._k]: picked(g) === c._k && !g.required ? null : c._k }));

  if (!groups.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div role="heading" aria-level={3} className="text-xl font-semibold">Nothing to preview yet</div>
        <p className="mt-2 text-sm text-muted">Add an option group with at least one named choice, then come back to see what customers will see.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[44rem] px-4 py-8 sm:px-6 sm:py-10">
      <p className={eyebrow}>Customer view</p>
      <div role="heading" aria-level={3} className="mt-4 text-3xl font-semibold">{model.title || `Customize ${dish.name || 'your dish'}`}</div>
      <p className="mt-3 text-sm text-muted">{model.hint || dish.name}</p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => {
          const cur = picked(g);
          return (
            <section key={g._k} aria-label={g.label}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-lg">{g.label || 'Options'}</div>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${g.required ? 'bg-okbg text-ok' : 'bg-chip text-muted'}`}>
                  {g.required ? 'Required' : 'Optional'}
                </span>
              </div>
              <div className={`grid gap-3 ${g.layout === 'cards' ? 'sm:grid-cols-2' : g.layout === 'grid' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                {g.choices.map((c) => {
                  const on = cur === c._k;
                  return (
                    <button
                      key={c._k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(g, c)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 text-left shadow-card transition-colors ${
                        g.layout === 'list' ? 'py-5' : g.layout === 'grid' ? 'py-4' : 'py-4'
                      } ${on ? 'border-ok bg-okbg' : 'border-line bg-chip/50 hover:bg-chip'}`}
                    >
                      {c.icon && <span aria-hidden="true" className="flex-none text-2xl">{c.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{c.name}</span>
                        {g.layout === 'cards' && c.desc && <span className="mt-1 block line-clamp-2 text-[11px] text-muted">{c.desc}</span>}
                        {g.layout === 'grid' && c.sub && <span className="mt-0.5 block text-[11px] text-muted">{c.sub}</span>}
                      </span>
                      <span className="flex flex-none items-center gap-1.5 text-xs tabular-nums">
                        {priceLabel(c.price)}
                        {on && <Icon name="check" size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
