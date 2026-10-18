'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CONFIG } from '@/lib/config';
import { useInstall } from '@/lib/useInstall';
import { useScrollLock } from '@/lib/useScrollLock';
import { useCafeOpen } from '@/lib/useCafeOpen';
import ThemeToggle from '@/components/ThemeToggle';
import { Icon, Switch } from '@/components/owner/ui';

export const TABS = [
  { id: 'Orders', icon: 'orders' },
  { id: 'Analytics', icon: 'analytics' },
  { id: 'Menu', icon: 'menu' },
];

const readCollapsed = () => {
  try {
    return localStorage.getItem('owner-sidebar') === 'collapsed';
  } catch {
    return false;
  }
};

export function Logo({ compact, subtitle = 'Owner workspace' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#1B5E3B] text-white">
        <Icon name="coffee" size={20} />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-base font-semibold">{CONFIG.name}</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{subtitle}</span>
        </span>
      )}
    </div>
  );
}

// Avatar row + a small menu with Install app / QR codes / Sign out
export function UserMenu({ email, onSignOut, compact, up = true, roleLabel = 'Owner', showQr = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { installed, canInstall, install } = useInstall();
  const name = (email || roleLabel.toLowerCase()).split('@')[0];
  const shown = name.charAt(0).toUpperCase() + name.slice(1);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-chip focus:bg-chip focus:outline-none';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-chip ${compact ? 'justify-center' : ''}`}
      >
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-okbg text-sm font-bold text-ok">
          {shown.charAt(0)}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{shown}</span>
              <span className="block truncate text-xs text-muted">{roleLabel}</span>
            </span>
            <Icon name="chevronDown" size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-60 rounded-2xl border border-edge bg-card p-1.5 shadow-xl ${up ? 'bottom-full mb-2' : 'top-full mt-2'} ${compact ? 'left-0' : 'left-0 right-0 w-auto'}`}
        >
          {!installed && canInstall && (
            <button role="menuitem" className={item} onClick={() => { setOpen(false); install(); }}>
              <Icon name="install" /> Install app
            </button>
          )}
          {showQr && (
            <a role="menuitem" href="/qr" className={item} onClick={() => setOpen(false)}>
              <Icon name="qr" /> QR codes
            </a>
          )}
          <button role="menuitem" className={`${item} text-red-600`} onClick={() => { setOpen(false); onSignOut(); }}>
            <Icon name="signout" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function CafeOpenToggle({ compact }) {
  const { loading, ready, open, setOpen } = useCafeOpen();
  const [err, setErr] = useState('');

  async function change(v) {
    setErr('');
    const ok = await setOpen(v);
    if (!ok) setErr('Could not save. Is the owner signed in?');
  }

  if (compact) {
    return (
      <div className="flex justify-center py-1" title={open ? 'Café is open' : 'Café is closed'}>
        <Switch size="sm" checked={open} onChange={change} disabled={loading || !ready} label="Café is open" />
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-chip p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2 w-2 rounded-full ${open ? 'bg-ok' : 'bg-muted'}`} />
            {open ? 'Café is open' : 'Café is closed'}
          </div>
          <div className="mt-0.5 text-xs text-muted">{open ? 'Taking new orders' : 'New orders are paused'}</div>
        </div>
        <Switch checked={open} onChange={change} disabled={loading || !ready} label="Café is open" />
      </div>
      {!loading && !ready && (
        <p className="mt-2 text-[11px] text-muted">One-time setup: run supabase/cafe-open.sql in Supabase to turn this on.</p>
      )}
      {err && <p role="alert" className="mt-2 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

function HelpCard({ compact }) {
  const [open, setOpen] = useState(false);
  const row = 'flex w-full items-center gap-3 rounded-xl p-2 text-sm font-semibold text-muted hover:bg-chip hover:text-ink';
  const label = compact ? null : <span>Need a hand?</span>;
  if (CONFIG.help) {
    return (
      <a href={CONFIG.help} target="_blank" rel="noreferrer" className={`${row} ${compact ? 'justify-center' : ''}`} title="Need a hand?">
        <Icon name="help" /> {label}
      </a>
    );
  }
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${row} ${compact ? 'justify-center' : ''}`} title="Need a hand?">
        <Icon name="help" /> {label}
      </button>
      {open && !compact && (
        <ul className="mx-2 mb-1 list-disc space-y-1 pl-5 text-xs text-muted">
          <li>Tap “Mark Completed” when an order is served.</li>
          <li>Switch a dish off in Menu when it runs out.</li>
          <li>Use More options in a dish to add sizes or add-ons.</li>
        </ul>
      )}
    </div>
  );
}

function NavItems({ tab, onSelect, badge, compact }) {
  return (
    <nav aria-label="Owner sections" className="space-y-1">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-current={active ? 'page' : undefined}
            title={compact ? t.id : undefined}
            className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${compact ? 'justify-center' : ''} ${active ? 'bg-okbg text-ok' : 'text-muted hover:bg-chip hover:text-ink'}`}
          >
            <Icon name={t.icon} />
            {!compact && <span className="flex-1 text-left">{t.id}</span>}
            {t.id === 'Orders' && badge > 0 && (
              <span className={`grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-on-accent ${compact ? 'absolute right-1 top-1' : ''}`}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarBody({ tab, onSelect, badge, compact, email, onSignOut }) {
  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className={compact ? 'flex justify-center pt-1' : 'px-1 pt-1'}>
        <Logo compact={compact} />
      </div>
      <div>
        {!compact && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Manage your café</p>}
        <NavItems tab={tab} onSelect={onSelect} badge={badge} compact={compact} />
      </div>
      <div className="mt-auto space-y-2">
        <CafeOpenToggle compact={compact} />
        <HelpCard compact={compact} />
        <div className="border-t border-line pt-2">
          <UserMenu email={email} onSignOut={onSignOut} compact={compact} />
        </div>
      </div>
    </div>
  );
}

const noopSubscribe = () => () => {};
const today = () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function OwnerShell({ tab, setTab, badge = 0, email, onSignOut, children }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const date = useSyncExternalStore(noopSubscribe, today, () => ''); // '' while pre-rendering, today's date in the browser
  useScrollLock(drawer);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem('owner-sidebar', c ? 'open' : 'collapsed');
      } catch {}
      return !c;
    });
  }

  const select = (id) => {
    setTab(id);
    setDrawer(false);
  };

  return (
    <div className="owner-theme min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        className={`sticky top-0 hidden h-dvh flex-none border-r border-line bg-card transition-[width] duration-200 lg:block ${collapsed ? 'w-[4.75rem]' : 'w-64'}`}
      >
        <SidebarBody tab={tab} onSelect={select} badge={badge} compact={collapsed} email={email} onSignOut={onSignOut} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 px-3 py-2.5 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="relative grid h-10 w-10 flex-none place-items-center rounded-xl border border-edge bg-card lg:hidden"
            >
              <Icon name="hamburger" />
              {badge > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />}
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-10 w-10 flex-none place-items-center rounded-xl border border-edge bg-card hover:bg-chip lg:grid"
            >
              <Icon name={collapsed ? 'chevronRight' : 'panelLeft'} />
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">Workspace</span>
              <Icon name="chevronRight" size={14} className="hidden text-muted sm:block" />
              <span className="truncate font-semibold">{tab}</span>
            </nav>

            <div className="ml-auto flex flex-none items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-2 text-sm text-muted md:flex">
                <Icon name="calendar" size={16} /> {date}
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>

      {/* Mobile: bottom drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-card shadow-sheet">
            <div className="flex justify-center pt-2">
              <span className="h-1.5 w-10 rounded-full bg-line" />
            </div>
            <div className="safe-bottom">
              <SidebarBody tab={tab} onSelect={select} badge={badge} compact={false} email={email} onSignOut={onSignOut} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}