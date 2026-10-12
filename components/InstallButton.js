'use client';
import { useInstall } from '@/lib/useInstall';

export default function InstallButton() {
  const { installed, canInstall, hint, install } = useInstall();

  if (installed) return null;
  if (canInstall) {
    return (
      <button onClick={install} className="rounded-md bg-chip px-4 py-2 text-sm font-semibold">
        Install app
      </button>
    );
  }
  if (hint) return <span className="max-w-56 text-xs text-muted">{hint}</span>;
  return null;
}