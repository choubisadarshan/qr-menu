// SERVER ONLY. Uses the secret key, which can do anything in your database.
// Never import this file from a component with 'use client', and never prefix the key with NEXT_PUBLIC_.
import { createClient } from '@supabase/supabase-js';

let client;

export function admin() {
  if (!client) {
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}