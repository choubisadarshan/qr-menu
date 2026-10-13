'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStaff, signOut } from '@/lib/useStaff';
import { useNewOrders } from '@/lib/useNewOrders';
import OwnerShell from '@/components/owner/OwnerShell';
import OwnerOrders from '@/components/OwnerOrders';
import OwnerMenu from '@/components/OwnerMenu';
import OwnerAnalytics from '@/components/OwnerAnalytics';

export default function OwnerPage() {
  const router = useRouter();
  const { loading, email } = useStaff(['owner'], '/owner/login');
  const [tab, setTab] = useState('Orders');
  const newOrders = useNewOrders();

  if (loading) return <p className="p-10 text-center text-muted">Loading…</p>;

  return (
    <OwnerShell tab={tab} setTab={setTab} badge={newOrders} email={email} onSignOut={() => signOut(router, '/owner/login')}>
      {tab === 'Orders' ? <OwnerOrders /> : tab === 'Analytics' ? <OwnerAnalytics /> : <OwnerMenu />}
    </OwnerShell>
  );
}