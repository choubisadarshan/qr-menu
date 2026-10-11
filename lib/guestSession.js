// A "visit" = one guest's sitting at ONE table. It has a random session id kept on the guest's phone.
//  - Scanning the QR again at the same table  -> same visit, so the guest still sees their orders and the amount to pay
//  - Scanning a different table               -> that table has its own visit
//  - Everything paid and finished (decided by the server) -> the next scan starts a brand-new visit
// The menu and the cart always start fresh on every scan; only the guest's own orders are remembered.
const KEY = 'guest-sessions';
const DAY = 24 * 60 * 60 * 1000;
const memory = {}; // fallback when the browser blocks storage (private mode)

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); // plain-http fallback (LAN testing)
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}

function browserStorage() {
  try {
    window.localStorage.setItem('__t', '1');
    window.localStorage.removeItem('__t');
    return window.localStorage;
  } catch {
    return {
      getItem: (k) => memory[k] ?? null,
      setItem: (k, v) => {
        memory[k] = v;
      },
    };
  }
}

function readAll(st) {
  try {
    const o = JSON.parse(st.getItem(KEY) || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

// The saved visit for this table, or null if there is none (or it is older than a day).
export function getSession(table, st = browserStorage(), now = Date.now()) {
  const s = readAll(st)[table];
  if (!s || !s.id || now - (s.t || 0) > DAY) return null;
  return s;
}

// Starts a brand-new visit for this table and saves it. Other tables' visits are kept.
export function startSession(table, { st = browserStorage(), id = newId(), now = Date.now() } = {}) {
  const kept = {};
  for (const [k, v] of Object.entries(readAll(st))) {
    if (v && v.id && now - (v.t || 0) <= DAY) kept[k] = v;
  }
  kept[table] = { id, t: now };
  try {
    st.setItem(KEY, JSON.stringify(kept));
  } catch {}
  return kept[table];
}