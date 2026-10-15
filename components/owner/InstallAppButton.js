'use client';
import { useState } from 'react';
import { useInstall } from '@/lib/useInstall';
import { Icon } from '@/components/owner/ui';

// Visible "Install app" button for the owner dashboard (PWA).
// - Browser offers the install prompt -> one tap installs.
// - iPhone / browsers without a prompt -> tap shows how to add it to the home screen.
// - Already installed -> nothing is shown.
export default function InstallAppButton() {
  const { installed, canInstall, hint, install } = useInstall();
  const [showHint, setShowHint] = useState(false);

  if (installed || (!canInstall && !hint)) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (canInstall ? install() : setShowHint((v) => !v))}
        aria-expanded={canInstall ? undefined : showHint}
        className="flex items-center gap-2 rounded-xl border border-edge bg-card px-4 py-2.5 text-sm font-semibold shadow-card hover:bg-chip"
      >
        <Icon name="install" size={16} /> Install app
      </button>
      {!canInstall && showHint && (
        <p role="status" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-edge bg-card p-3 text-xs leading-relaxed shadow-xl">
          {hint}
        </p>
      )}
    </div>
  );
}
