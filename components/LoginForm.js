'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import InstallButton from '@/components/InstallButton';
import ThemeToggle from '@/components/ThemeToggle';

const ALLOWED = { kitchen: ['kitchen', 'owner'], owner: ['owner'] };
const TITLE = { kitchen: 'Kitchen', owner: 'Owner' };

export default function LoginForm({ app }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setBusy(false);
      return setError('Wrong email or password.');
    }
    const { data: staff } = await supabase
      .from('staff')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (!staff || !ALLOWED[app].includes(staff.role)) {
      await supabase.auth.signOut();
      setBusy(false);
      return setError(staff ? 'This account cannot open this app.' : 'This account has no staff access.');
    }
    router.replace(`/${app}`);
  }

  const input = 'w-full rounded-xl bg-chip p-3 outline-none focus:ring-2 focus:ring-accent';
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-4">
      <div className="mb-6 flex justify-end">
        <ThemeToggle />
      </div>
      <h1 className="text-2xl font-semibold">{CONFIG.name}</h1>
      <p className="mb-6 text-muted">{TITLE[app]} login</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="username" className={input}
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="pw" className="mb-1 block text-sm font-medium">Password</label>
          <input id="pw" type="password" autoComplete="current-password" className={input}
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-2xl bg-accent p-3.5 text-lg font-semibold text-on-accent disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="mt-6 flex justify-center">
        <InstallButton />
      </div>
    </main>
  );
}