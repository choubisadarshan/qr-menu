'use client';

export default function Error({ error, reset }) {
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
      <p className="mb-4 break-words rounded-xl bg-chip p-3 text-left text-sm text-muted">
        {error?.message || 'Unknown error'}
      </p>
      <button onClick={() => reset()} className="rounded-xl bg-accent px-5 py-3 font-semibold text-white">
        Try again
      </button>
    </main>
  );
}