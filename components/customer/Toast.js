'use client';
import { CheckIcon } from '@/components/customer/shared';

export default function Toast({ toast }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-5 z-50 flex w-[90%] max-w-[340px] -translate-x-1/2 items-center gap-3 rounded-card border border-white/10 bg-hero px-4 py-3 text-hero-ink shadow-2xl transition-all duration-300 ${
        toast?.show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'
      }`}
    >
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
        <CheckIcon size={16} />
      </div>
      <div className="min-w-0 flex-1 text-xs">
        <p className="truncate font-bold">{toast?.title}</p>
        <p className="truncate text-[11px] opacity-75">{toast?.sub}</p>
      </div>
    </div>
  );
}