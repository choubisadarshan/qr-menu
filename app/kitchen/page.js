'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStaff, signOut } from '@/lib/useStaff';
import { CONFIG } from '@/lib/config';
import InstallButton from '@/components/InstallButton';

const NEXT = {
  received: ['preparing', 'Start preparing'],
  preparing: ['ready', 'Mark ready'],
  ready: ['completed', 'Complete order'],
};

export default function KitchenPage() {
  const router = useRouter();
  const { loading } = useStaff(['kitchen', 'owner']);
  const [orders, setOrders] = useState([]);
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState(0);
  const audio = useRef(null);

  const load = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .neq('status', 'completed')
      .gte('created_at', start.toISOString())
      .order('created_at');
    setOrders(data || []);
  }, []);

  // Keep the tablet screen awake
  useEffect(() => {
    let lock;
    const get = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
      } catch {}
    };
    get();
    const onVis = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.();
    };
  }, []);

  // Live orders + sound
  useEffect(() => {
    if (loading) return;
    load();
    setNow(Date.now());
    const beep = () => {
      const c = audio.current;
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
      o.start();
      o.stop(c.currentTime + 0.7);
    };
    const ch = supabase
      .channel('kitchen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        beep();
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, load)
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(tick);
    };
  }, [loading, load]);

  async function setStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id);
    load();
  }

  if (loading) return <p className="p-10 text-center text-muted">Loading…</p>;

  return (
    <main className="mx-auto max-w-6xl p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{CONFIG.name} · Kitchen</h1>
          <p className="text-sm text-muted">{orders.length} active order{orders.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InstallButton />
          <button
            onClick={() => {
              audio.current = new (window.AudioContext || window.webkitAudioContext)();
              setSoundOn(true);
            }}
            disabled={soundOn}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:bg-chip disabled:text-muted"
          >
            {soundOn ? 'Sound alerts on' : 'Enable sound alerts'}
          </button>
          <button onClick={() => signOut(router)} className="rounded-full bg-chip px-4 py-2 text-sm font-semibold">
            Sign out
          </button>
        </div>
      </header>

      {orders.length === 0 && (
        <p className="py-20 text-center text-muted">No active orders. New orders appear here instantly.</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => {
          const next = NEXT[o.status];
          const mins = Math.max(0, Math.round((now - new Date(o.created_at).getTime()) / 60000));
          return (
            <article key={o.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-3xl font-bold">Table {o.table_number}</div>
                  <div className="text-sm text-muted">
                    #{o.id} · {o.customer_name}
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-chip px-3 py-1 text-xs font-semibold capitalize">{o.status}</span>
                  <div className={`mt-1 text-sm font-semibold ${mins >= 15 ? 'text-accent' : 'text-muted'}`}>
                    {mins} min
                  </div>
                </div>
              </div>

              <ul className="my-3 divide-y divide-line text-lg">
                {o.order_items.map((i) => (
                  <li key={i.id} className="py-2">
                    <b>{i.quantity} ×</b> {i.item_name}
                  </li>
                ))}
              </ul>

              {o.note && (
                <p className="mb-3 rounded-lg bg-chip p-2 text-sm font-semibold text-accent">Note: {o.note}</p>
              )}

              <p className="mb-3 text-sm text-muted">
                {o.payment_status === 'paid' ? 'Paid at counter' : 'Not paid yet'}
              </p>

              {next && (
                <button
                  onClick={() => setStatus(o.id, next[0])}
                  className="w-full rounded-xl bg-accent p-3.5 text-lg font-semibold text-white"
                >
                  {next[1]}
                </button>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}