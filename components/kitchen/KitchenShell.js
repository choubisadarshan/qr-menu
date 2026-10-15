'use client';
import { useEffect, useState } from 'react';
import { CONFIG } from '@/lib/config';
import { useScrollLock } from '@/lib/useScrollLock';
import ThemeToggle from '@/components/ThemeToggle';
import { Icon } from '@/components/owner/ui';
import { Logo, UserMenu } from '@/components/owner/OwnerShell';

// Same look as the owner workspace: soft-green page, white cards, collapsible sidebar on desktop,
// slide-up drawer on phones. The user menu at the bottom holds Install app and Sign out.
export const KITCHEN_TABS = [
  { id: 'Kitchen', icon: 'chef' },
  { id: 'Order history', icon: 'orders' },
];

const readCollapsed = () => {
  try {
    return localStorage.getItem('kitchen-sidebar') === 'collapsed';
  } catch {
    return false;
  }
};

const today = () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function NavItems({ tab, onSelect, badge, compact }) {
  return (
    <nav aria-label="Kitchen sections" className="space-y-1">
      {KITCHEN_TABS.map((t) => {
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
            {t.id === 'Kitchen' && badge > 0 && (
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
        <Logo compact={compact} subtitle="Kitchen workspace" />
      </div>
      <div>
        {!compact && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Workspace</p>}
        <NavItems tab={tab} onSelect={onSelect} badge={badge} compact={compact} />
      </div>
      <div className="mt-auto border-t border-line pt-2">
        <UserMenu email={email} onSignOut={onSignOut} compact={compact} roleLabel="Kitchen team" showQr={false} />
      </div>
    </div>
  );
}

export default function KitchenShell({ tab, setTab, badge = 0, email, onSignOut, children }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [date] = useState(today); // this screen only renders after sign-in, so no server/client mismatch
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
        localStorage.setItem('kitchen-sidebar', c ? 'open' : 'collapsed');
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
              {date && (
                <span className="hidden items-center gap-2 text-sm text-muted md:flex">
                  <Icon name="calendar" size={16} /> {date}
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-6">{children}</main>
        <p className="mx-auto max-w-6xl px-3 pb-6 text-xs text-muted sm:px-6">{CONFIG.name} · Made with care, served with love.</p>
      </div>

      {/* Mobile: bottom drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/45" />
          <div className="anim-sheet absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-card shadow-sheet">
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
