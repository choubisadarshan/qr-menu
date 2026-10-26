// Add-ons are small extras (extra pav, butter, roti, salad...). They are normal dishes kept in a category named
// "Add-ons" (or "Extras"). They are hidden from the main menu and offered on the guest's "My orders" screen
// according to what they ordered. menu_items.goes_with lists the dish ids an add-on is suggested with
// (empty = suggested with every dish).
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');
const ADDON_NAMES = new Set(['addons', 'addon', 'extras', 'extra', 'extrasaddons', 'addonsextras']);

export const isAddonCategory = (category) => ADDON_NAMES.has(norm(category));
export const isAddon = (dish) => isAddonCategory(dish?.category);

export function goesWithIds(dish) {
  let v = dish?.goes_with;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      v = [];
    }
  }
  return Array.isArray(v) ? v.map(Number).filter(Number.isInteger) : [];
}

// For ONE placed order: which add-ons fit the dishes in it?
// Returns { dishName, addons } or null when there is nothing to suggest.
// (order_items only store the dish name, so the dish is found by name on the current menu.)
export function addonsForOrder(order, menu) {
  const addons = menu.filter(isAddon);
  if (addons.length === 0) return null;
  const byName = new Map(menu.filter((m) => !isAddon(m)).map((m) => [String(m.name).trim().toLowerCase(), m]));
  const dishes = [];
  for (const i of order?.order_items ?? []) {
    const d = byName.get(String(i.item_name).trim().toLowerCase());
    if (d && !dishes.includes(d)) dishes.push(d);
  }
  if (dishes.length === 0) return null; // e.g. an order that is only add-ons: nothing more to suggest

  const fits = (a, d) => {
    const ids = goesWithIds(a);
    return ids.length === 0 || ids.includes(d.id);
  };
  const matched = addons.filter((a) => dishes.some((d) => fits(a, d)));
  if (matched.length === 0) return null;
  const dish = dishes.find((d) => matched.some((a) => fits(a, d))) ?? dishes[0];
  return { dishName: dish.name, addons: matched };
}