'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Redirects to /login unless the signed-in user has one of the allowed roles.
export function useStaff(allowed) {
  const router = useRouter();
  const key = allowed.join(',');
  const [state, setState] = useState({ loading: true, role: null, email: '' });

  useEffect(() => {
    let live = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      const { data } = await supabase
        .from('staff')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!live) return;
      if (!data || !key.split(',').includes(data.role)) return router.replace('/login');
      setState({ loading: false, role: data.role, email: session.user.email });
    })();
    return () => {
      live = false;
    };
  }, [key, router]);

  return state;
}

export async function signOut(router) {
  await supabase.auth.signOut();
  router.replace('/login');
}