// Customizable dishes (pizza size, crust, pasta shape...). The options live in menu_items.options (JSON):
// {
//   "title": "Craft Your Pizza", "hint": "5 varieties • Hand-tossed crust",
//   "groups": [
//     { "key": "variety", "label": "Choose your Pizza", "required": true, "layout": "cards",
//       "choices": [ { "id": "margherita", "name": "Margherita Classica", "price": 0, "diet": "veg", "icon": "🍅", "desc": "..." } ] },
//     { "key": "size", "label": "Choose Portion / Size", "required": true, "layout": "grid",
//       "choices": [ { "id": "reg", "name": "Regular", "sub": "7\" • Serves 1", "price": 0 } ] },
//     { "key": "crust", "label": "Choose Crust Style", "required": false, "layout": "list", "choices": [ ... ] }
//   ]
// }
// Price of one unit = the dish's base price + the "price" of every selected choice.
// The SAME functions run in the browser (to show prices) and on the server (to charge them).
const str = (v, max) => String(v ?? '').slice(0, max);

// Cleans raw JSON from the database. Returns null if the dish is not customizable.
export function normalizeOptions(raw) {
  let o = raw;
  if (typeof o === 'string') {
    try {
      o = JSON.parse(o);
    } catch {
      return null;
    }
  }
  if (!o || typeof o !== 'object' || !Array.isArray(o.groups)) return null;
  const groups = [];
  for (const g of o.groups) {
    if (!g || typeof g !== 'object' || !g.key || !Array.isArray(g.choices)) continue;
    const choices = g.choices
      .filter((c) => c && c.id && c.name)
      .map((c) => ({
        id: str(c.id, 40),
        name: str(c.name, 60),
        sub: c.sub ? str(c.sub, 60) : '',
        desc: c.desc ? str(c.desc, 160) : '',
        icon: c.icon ? str(c.icon, 8) : '',
        diet: c.diet === 'non-veg' ? 'non-veg' : 'veg',
        price: Number(c.price) || 0,
      }));
    if (!choices.length) continue;
    groups.push({
      key: str(g.key, 30),
      label: str(g.label || g.key, 60),
      required: g.required !== false,
      layout: g.layout === 'cards' || g.layout === 'grid' ? g.layout : 'list',
      choices,
    });
  }
  if (!groups.length) return null;
  return { title: o.title ? str(o.title, 60) : '', hint: o.hint ? str(o.hint, 80) : '', groups };
}

export const optionsHint = (opts) => opts.hint || opts.groups.map((g) => g.label).join(' • ');

// First choice of every group (skipping non-veg choices when "Veg only" is on).
export function defaultSelection(opts, vegOnly = false) {
  const sel = {};
  for (const g of opts.groups) {
    const pool = vegOnly ? g.choices.filter((c) => c.diet !== 'non-veg') : g.choices;
    sel[g.key] = (pool.length ? pool : g.choices)[0].id;
  }
  return sel;
}

export function priceFor(base, opts, sel) {
  let p = Number(base) || 0;
  for (const g of opts?.groups ?? []) {
    const c = g.choices.find((x) => x.id === sel?.[g.key]);
    if (c) p += c.price;
  }
  return Math.max(0, Math.round(p * 100) / 100);
}

// "Margherita Classica · Regular · Classic Hand-Tossed Thin"
export function describe(opts, sel) {
  return (opts?.groups ?? [])
    .map((g) => g.choices.find((c) => c.id === sel?.[g.key])?.name)
    .filter(Boolean)
    .join(' · ');
}

// Checks a selection against the dish's real options. Returns { error } or { sel }.
export function validateSelection(opts, rawSel) {
  const input = rawSel && typeof rawSel === 'object' ? rawSel : {};
  const sel = {};
  for (const g of opts.groups) {
    const id = input[g.key];
    if (id == null || id === '') {
      if (g.required) return { error: `Please choose: ${g.label}` };
      continue;
    }
    if (!g.choices.some((c) => c.id === String(id))) return { error: `Invalid choice for ${g.label}.` };
    sel[g.key] = String(id);
  }
  return { sel };
}