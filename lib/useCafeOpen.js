'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// "Café is open" switch. Stored in the cafe_settings table (see supabase/cafe-open.sql).
// If that table does not exist yet, `ready` is false and the switch tells the owner to run the SQL.
export function useCafeOpen() {
  const [state, setState] = useState({ loading: true, ready: false, open: true });

  useEffect(() => {
    let live = true;
    supabase
      .from('cafe_settings')
      .select('value')
      .eq('key', 'open')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) return setState({ loading: false, ready: false, open: true });
        setState({ loading: false, ready: true, open: data ? data.value !== false : true });
      });
    return () => {
      live = false;
    };
  }, []);

  const setOpen = useCallback(async (open) => {
    setState((s) => ({ ...s, open })); // optimistic
    const { error } = await supabase
      .from('cafe_settings')
      .upsert({ key: 'open', value: open, updated_at: new Date().toISOString() });
    if (error) setState((s) => ({ ...s, open: !open }));
    return !error;
  }, []);

  return { ...state, setOpen };
}