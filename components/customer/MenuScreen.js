'use client';
import { useEffect, useMemo, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { CONFIG, money } from '@/lib/config';
import { normalizeOptions, optionsHint } from '@/lib/options';
import { VegMark, Ornament, Thumb, ChevronRight } from '@/components/customer/shared';

const sectionId = (c) => `cat-${String(c).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

function DishCard({ m, qty, onAdd, onCustomize }) {
  const opts = normalizeOptions(m.options);
  const custom = !!opts;
  return (
    <article
      className={`flex items-start justify-between gap-3 rounded-card p-3.5 shadow-card ${
        custom ? 'border-2 border-accent/25 bg-gradient-to-br from-card to-chip' : 'border border-line bg-card'
      }`}
    >
      <div className="min-w-0 flex-1 pr-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <VegMark veg={m.is_veg} />
          <h3 className="font-display text-[15px] font-bold leading-snug">{m.name}</h3>
          {m.tag && (
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              {m.tag}
            </span>
          )}
        </div>
        {custom && (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            <span>{optionsHint(opts)}</span>
          </div>
        )}
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted">{m.description}</p>
        <div className="flex items-center justify-between gap-3">
          {custom ? (
            <span className="text-xs font-semibold text-muted">
              From <strong className="text-sm font-bold text-ink">{money(m.price)}</strong>
            </span>
          ) : (
            <span className="text-sm font-bold tabular-nums">{money(m.price)}</span>
          )}
          <button
            onClick={() => (custom ? onCustomize(m) : onAdd(m))}
            aria-label={custom ? `Customize ${m.name}` : `Add ${m.name}`}
            className={`flex items-center gap-1.5 rounded-btn bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent transition active:scale-95 hover:bg-accent-hover ${
              custom ? 'shadow-sm ring-2 ring-accent/20' : ''
            }`}
          >
            <span>{custom ? '+ Customize' : '+ Add'}</span>
            {qty > 0 && (
              <span className="rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-accent">{qty}</span>
            )}
          </button>
        </div>
      </div>
      <Thumb m={m} className="h-16 w-16 text-2xl" />
    </article>
  );
}

export default function MenuScreen({
  table,
  menu,
  loading,
  loadError,
  qtyByDish,
  cartCount,
  cartSubtotal,
  vegOnly,
  setVegOnly,
  activeOrders,
  hasOrders,
  onAdd,
  onCustomize,
  onBasket,
  onStatus,
}) {
  const [active, setActive] = useState('all');

  const sections = useMemo(() => {
    const order = [];
    const map = {};
    for (const m of menu) {
      if (vegOnly && !m.is_veg) continue;
      if (!map[m.category]) {
        map[m.category] = [];
        order.push(m.category);
      }
      map[m.category].push(m);
    }
    return order.map((c) => ({ name: c, id: sectionId(c), items: map[c] }));
  }, [menu, vegOnly]);

  const allCategories = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);

  // Highlight the pill of the section you are reading
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.dataset.cat);
      },
      { rootMargin: '-110px 0px -60% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    const onScroll = () => {
      if (window.scrollY < 140) setActive('all');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [sections]);

  function jump(cat) {
    setActive(cat);
    if (cat === 'all') return window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById(sectionId(cat))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const pill = (on) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 ${
      on ? 'bg-accent text-on-accent shadow-sm' : 'border border-line bg-card text-muted hover:bg-chip'
    }`;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-bg pb-28 shadow-xl">
      {/* Hero header */}
      <header className="relative rounded-b-hero bg-hero px-6 pb-7 pt-5 text-hero-ink shadow-md">
        <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase opacity-95">
          <span className="flex items-center gap-1.5 tracking-[0.2em]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Table {table}
          </span>
          <div className="flex items-center gap-2">
            {hasOrders && (
              <button
                onClick={onStatus}
                className="rounded-full bg-white/10 px-3.5 py-2 text-[11px] font-semibold normal-case tracking-normal transition hover:bg-white/20 active:scale-95"
              >
                My orders
                {activeOrders > 0 && (
                  <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-on-accent">{activeOrders}</span>
                )}
              </button>
            )}
            <ThemeToggle tone="hero" />
          </div>
        </div>
        <div className="pb-3 pt-1 text-center">
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{CONFIG.name}</h1>
          <Ornament className="my-2.5" />
          <p className="mx-auto max-w-[270px] text-xs leading-relaxed opacity-80 sm:text-[13px]">
            Pick your dishes, order from your seat, and pay at the counter.
          </p>
        </div>
      </header>

      {/* Category pills: sticky, swipe sideways, tap to jump */}
      <nav aria-label="Menu categories" className="sticky top-0 z-30 bg-bg/95 px-4 pb-2.5 pt-3.5 backdrop-blur-md">
        <div className="relative">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-0.5 pr-8">
            <button onClick={() => jump('all')} aria-pressed={active === 'all'} className={pill(active === 'all')}>
              All items
            </button>
            {allCategories.map((c) => (
              <button key={c} onClick={() => jump(c)} aria-pressed={active === c} className={pill(active === c)}>
                {c}
              </button>
            ))}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              aria-pressed={vegOnly}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                vegOnly ? 'border-ok bg-ok text-on-ok' : 'border-line bg-card text-muted'
              }`}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-white bg-emerald-600" />
              Veg only
            </button>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-bg to-transparent" aria-hidden="true" />
        </div>
      </nav>

      <main className="space-y-7 px-4 pt-3">
        {loading && (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-card bg-chip" />
            ))}
          </div>
        )}
        {loadError && <p className="py-10 text-center text-nonveg">{loadError}</p>}
        {!loading && !loadError && sections.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">No dishes match this filter.</p>
        )}

        {sections.map((s) => (
          <section key={s.id} id={s.id} data-cat={s.name} className="scroll-mt-20 space-y-3.5">
            <div className="flex items-center justify-between border-b border-line pb-1.5">
              <h2 className="font-display text-lg font-bold tracking-tight">{s.name}</h2>
              {s.items.some((m) => normalizeOptions(m.options)) && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Customizable</span>
              )}
            </div>
            {s.items.map((m) => (
              <DishCard key={m.id} m={m} qty={qtyByDish[m.id] || 0} onAdd={onAdd} onCustomize={onCustomize} />
            ))}
          </section>
        ))}

        <aside className="mb-4 mt-6 rounded-card border border-line bg-card p-4 text-center">
          <p className="text-xs leading-relaxed text-muted">
            Dietary request? Add a note for the kitchen when you confirm your order.
          </p>
        </aside>
      </main>

      {/* Floating order bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-4 pt-2">
        <div className="flex items-center justify-between rounded-card border border-white/10 bg-bar p-3.5 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent shadow-sm">
              {cartCount}
            </div>
            <div>
              <div className="text-[11px] font-medium opacity-75">Table {table} Order</div>
              <div className="text-sm font-bold tabular-nums">{money(cartSubtotal)}</div>
            </div>
          </div>
          <button
            onClick={onBasket}
            className="inline-flex items-center gap-1.5 rounded-tile bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-sm transition hover:bg-accent-hover active:scale-95"
          >
            View Table Order
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}