'use client';
import { useInstall } from '@/lib/useInstall';

export default function InstallButton() {
  const { installed, canInstall, install } = useInstall();
  if (installed || !canInstall) return null;
  return (
    <button onClick={install} className="rounded-md bg-chip px-4 py-2 text-sm font-semibold">
      Install app
    </button>
  );
}
