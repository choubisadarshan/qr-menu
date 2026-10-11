// One "visit" = one QR scan. Each visit gets its own random session id.
// The id lives in sessionStorage (it belongs to this browser tab), is sent with every order,
// and is the ONLY thing that decides which orders this guest can see.
const KEY = 'guest-session';
const memory = {}; // fallback when the browser blocks storage (private mode)

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); // plain-http fallback (LAN testing)
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}

function browserEnv() {
  let storage;
  try {
    window.sessionStorage.setItem('__t', '1');
    window.sessionStorage.removeItem('__t');
    storage = window.sessionStorage;
  } catch {
    storage = {
      getItem: (k) => memory[k] ?? null,
      setItem: (k, v) => {
        memory[k] = v;
      },
    };
  }
  return {
    storage,
    navType: performance.getEntriesByType('navigation')[0]?.type, // 'navigate' | 'reload' | 'back_forward'
    origin: Math.round(performance.timeOrigin), // unique number for this page load
    newId,
  };
}

/**
 * Returns the session for this visit. A NEW session starts when:
 *  - there is none yet,
 *  - the table in the link is different from the stored one (Table 1 -> Table 4),
 *  - or the page was freshly opened from a link or QR scan (navigation type "navigate").
 * Refreshing the page or pressing Back keeps the same session, so a guest never loses their orders mid-meal.
 */
export function ensureSession(table, env = browserEnv()) {
  const { storage, navType, origin } = env;
  let s = null;
  try {
    s = JSON.parse(storage.getItem(KEY) || 'null');
  } catch {}
  const sameLoad = !!s && s.origin === origin;
  const fresh = !s || s.table !== table || (!sameLoad && navType === 'navigate');
  if (fresh) s = { id: env.newId(), table, origin };
  else if (!sameLoad) s = { ...s, origin };
  try {
    storage.setItem(KEY, JSON.stringify(s));
  } catch {}
  return s;
}