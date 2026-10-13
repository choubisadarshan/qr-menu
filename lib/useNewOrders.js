'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Number of orders still waiting (status "received") today. Drives the badge next to "Orders".
export function useNewOrders() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const { count: c, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'completed')
      .gte('created_at', d.toISOString());
    if (!error) setCount(c ?? 0);
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const ch = supabase
      .channel('owner-new-orders-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    const timer = setInterval(load, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      supabase.removeChannel(ch);
    };
  }, [load]);

  return count;
}