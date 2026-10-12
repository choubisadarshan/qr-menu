'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStaff, signOut } from '@/lib/useStaff';
import { CONFIG } from '@/lib/config';
import InstallButton from '@/components/InstallButton';
import HeaderMenu from '@/components/HeaderMenu';
import ThemeToggle from '@/components/ThemeToggle';
import OwnerOrders from '@/components/OwnerOrders';
import OwnerMenu from '@/components/OwnerMenu';
import OwnerAnalytics from '@/components/OwnerAnalytics';

export default function OwnerPage() {
  const router = useRouter();
  const { loading, email } = useStaff(['owner'], '/owner/login');
  const [tab, setTab] = useState('Orders');

  if (loading) return <p className="p-10 text-center text-muted">Loading…</p>;

  return (
    <main className="mx-auto max-w-6xl p-4">
      <header className="mb-4 flex items-center justify-between gap-3 md:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold md:text-2xl">{CONFIG.name} · Owner</h1>
          <p className="truncate text-sm text-muted">{email}</p>
        </div>

        {/* Desktop: separate buttons */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <InstallButton />
          <ThemeToggle />
          <a href="/qr" className="rounded-md bg-chip px-4 py-2 text-sm font-semibold">QR codes</a>
          <button onClick={() => signOut(router, '/owner/login')} className="rounded-md bg-chip px-4 py-2 text-sm font-semibold">
            Sign out
          </button>
        </div>

        {/* Mobile: theme toggle + one dropdown for Install app / QR codes / Sign out */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <HeaderMenu onSignOut={() => signOut(router, '/owner/login')} />
        </div>
      </header>

      <div className="mb-4 flex gap-2" role="group" aria-label="Sections">
        {['Orders', 'Analytics', 'Menu'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-md px-5 py-2 font-semibold ${tab === t ? 'bg-accent text-on-accent' : 'bg-chip'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Orders' ? <OwnerOrders /> : tab === 'Analytics' ? <OwnerAnalytics /> : <OwnerMenu />}
    </main>
  );
}