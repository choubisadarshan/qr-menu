'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CONFIG, money } from '@/lib/config';
import { getSession, startSession } from '@/lib/guestSession';
import { addToCart, changeQty, removeLine, replaceLine, cartTotals, qtyForDish } from '@/lib/cart';
import { normalizeOptions } from '@/lib/options';
import MenuScreen from '@/components/customer/MenuScreen';
import BasketScreen from '@/components/customer/BasketScreen';
import StatusScreen from '@/components/customer/StatusScreen';
import Customizer from '@/components/customer/Customizer';
import Toast from '@/components/customer/Toast';

// The three screens: menu  ->  basket (edit items, place order)  ->  status (final screen)
export default function MenuApp() {
  const params = useSearchParams();
  const table = (params.get('table') || '1').replace(/[^\w-]/g, '').slice(0, 6) || '1';

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lines, setLines] = useState([]); // the basket
  const [vegOnly, setVegOnly] = useState(false);
  const [customizing, setCustomizing] = useState(null); // { item, line? }
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [justPlaced, setJustPlaced] = useState(null);
  const [tab, setTab] = useState(null); // 'active' | 'completed' | null (pick automatically)
  const toastTimer = useRef(null);

  // Which screen is showing lives in the address bar (?view=basket / ?view=status),
  // so the phone's Back button moves between screens instead of leaving the site.
  const rawView = params.get('view');
  const view =
    rawView === 'basket' || rawView === 'checkout' ? 'basket' : rawView === 'status' || rawView === 'orders' ? 'status' : 'menu';
  const pushed = useRef(false);

  const go = useCallback(
    (v, replace = false) => {
      const qs = new URLSearchParams({ table });
      if (v !== 'menu') qs.set('view', v);
      const url = `?${qs.toString()}`;
      if (replace) {
        window.history.replaceState(null, '', url);
      } else {
        window.history.pushState(null, '', url);
        pushed.current = true;
      }
      window.scrollTo(0, 0);
    },
    [table]
  );

  const back = useCallback(() => {
    if (pushed.current) window.history.back();
    else go('menu', true);
  }, [go]);

  const showToast = useCallback((title, sub) => {
    clearTimeout(toastTimer.current);
    setToast({ title, sub, show: true });
    toastTimer.current = setTimeout(() => setToast((t) => (t ? { ...t, show: false } : t)), 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Every scan opens a fresh MENU and an empty BASKET. The guest's own orders for this table stay on
  // screen until they are paid and finished; after that the next scan starts a brand-new visit.
  useEffect(() => {
    let alive = true;
    try {
      localStorage.removeItem('my-orders'); // older versions kept order history in a different place
    } catch {}
    setSessionId(null);
    setLines([]);
    setMyOrders([]);
    setOrdersReady(false);
    setJustPlaced(null);
    setTab(null);
    setForm((f) => ({ ...f, note: '' }));

    (async () => {
      let s = getSession(table);
      if (s) {
        try {
          const res = await fetch(`/api/orders?session=${encodeURIComponent(s.id)}`, { cache: 'no-store' });
          if (res.ok) {
            const r = await res.json();
            if (!r.open) s = null; // everything was paid and finished: start a fresh visit
          }
        } catch {
          // offline: keep the saved visit so the guest does not lose their orders
        }
      }
      if (!s) s = startSession(table);
      if (alive) setSessionId(s.id);
    })();

    return () => {
      alive = false;
    };
  }, [table]);

  // Load menu
  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('id')
      .then(({ data, error }) => {
        if (error) setLoadError('Could not load the menu. Please ask our staff.');
        else setMenu(data);
        setLoading(false);
      });
  }, []);

  // Load ONLY the orders of this visit (the server filters by session id and today)
  const loadMine = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/orders?session=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad response');
      const { orders } = await res.json();
      setMyOrders(Array.isArray(orders) ? orders : []);
    } catch {
      // keep what is on screen; the next refresh will try again
    }
    setOrdersReady(true);
  }, [sessionId]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  // Keep statuses fresh: every 5 seconds while something is unfinished or unpaid, and when the tab wakes up
  const needsPolling = myOrders.some((o) => o.status !== 'completed' || o.payment_status !== 'paid');
  useEffect(() => {
    if (!sessionId) return;
    const visible = () => document.visibilityState === 'visible';
    const poll = needsPolling ? setInterval(() => visible() && loadMine(), 5000) : null;
    const onVisible = () => visible() && loadMine();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (poll) clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionId, needsPolling, loadMine]);

  // Leaving the status screen resets its banner and tab
  useEffect(() => {
    if (view !== 'status') {
      setJustPlaced(null);
      setTab(null);
    }
  }, [view]);

  // After an order is placed, the basket is cleared once the status screen is showing
  useEffect(() => {
    if (view === 'status' && justPlaced) setLines([]);
  }, [view, justPlaced]);

  const totals = cartTotals(lines, CONFIG.taxRate);
  const qtyByDish = {};
  for (const l of lines) qtyByDish[l.id] = qtyForDish(lines, l.id);
  const activeOrders = myOrders.filter((o) => o.status !== 'completed').length;

  /* ----- basket actions ----- */
  function addSimple(item) {
    setLines((ls) =>
      addToCart(ls, { id: item.id, name: item.name, qty: 1, sel: {}, note: '', unit: Number(item.price), optionsText: '', custom: false })
    );
    showToast(`Added ${item.name}!`, `${money(item.price)} added to Table ${table} order.`);
  }

  function confirmCustom(entry, replaceKey) {
    setLines((ls) => (replaceKey ? replaceLine(ls, replaceKey, entry) : addToCart(ls, entry)));
    showToast(replaceKey ? `Updated: ${entry.name}` : `Added: ${entry.name}`, entry.optionsText || 'Customized for you');
  }

  function openBasket() {
    if (lines.length === 0) return showToast('Your basket is empty', 'Select items from the menu or customize a dish.');
    go('basket');
  }

  function editLine(line) {
    const item = menu.find((m) => m.id === line.id);
    if (!item || !normalizeOptions(item.options)) return showToast('Dish not available', 'Please remove it and pick another.');
    setCustomizing({ item, line });
  }

  async function placeOrder() {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) return setError('Please enter your name so we can call it out.');
    if (phone && !/^\d{10}$/.test(phone)) return setError('Phone number should be 10 digits.');
    if (!sessionId) return setError('Please wait a moment and try again.');
    if (lines.length === 0) return setError('Your basket is empty.');
    setError('');
    setBusy(true);

    let res;
    try {
      res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: sessionId,
          table,
          name,
          phone,
          note: form.note.trim(),
          items: lines.map((l) => ({ id: l.id, qty: l.qty, options: l.sel, note: l.note })),
        }),
      });
    } catch {
      setBusy(false);
      return setError('No connection. Please check your internet and try again.');
    }
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(result.error || 'Could not send your order. Please try again.');
    }

    setForm((f) => ({ ...f, note: '' }));
    await loadMine();
    setBusy(false);
    setTab('active');
    setJustPlaced(result.order.id);
    go('status', true); // replaces the basket step, so Back returns to the menu
  }

  return (
    <>
      {view === 'menu' && (
        <MenuScreen
          table={table}
          menu={menu}
          loading={loading}
          loadError={loadError}
          qtyByDish={qtyByDish}
          cartCount={totals.count}
          cartSubtotal={totals.subtotal}
          vegOnly={vegOnly}
          setVegOnly={setVegOnly}
          activeOrders={activeOrders}
          hasOrders={myOrders.length > 0}
          onAdd={addSimple}
          onCustomize={(item) => setCustomizing({ item })}
          onBasket={openBasket}
          onStatus={() => go('status')}
        />
      )}

      {view === 'basket' && (
        <BasketScreen
          table={table}
          lines={lines}
          totals={totals}
          form={form}
          setForm={setForm}
          error={error}
          busy={busy}
          onQty={(key, d) => setLines((ls) => changeQty(ls, key, d))}
          onRemove={(key) => setLines((ls) => removeLine(ls, key))}
          onEdit={editLine}
          onBack={back}
          onPlace={placeOrder}
        />
      )}

      {view === 'status' && (
        <StatusScreen table={table} orders={myOrders} ready={ordersReady} justPlaced={justPlaced} tab={tab} setTab={setTab} onBack={back} />
      )}

      {customizing && (
        <Customizer
          key={`${customizing.item.id}|${customizing.line?.key ?? 'new'}`}
          item={customizing.item}
          line={customizing.line}
          vegOnly={vegOnly}
          onClose={() => setCustomizing(null)}
          onConfirm={(entry) => confirmCustom(entry, customizing.line?.key)}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}