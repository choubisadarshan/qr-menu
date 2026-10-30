'use client';
import { useTheme } from '@/lib/useTheme';

export default function ThemeToggle({ tone = 'default' }) {
  const { theme, choose } = useTheme();

  if (!theme) return <span className="inline-block h-9 w-9" aria-hidden="true" />;

  const dark = theme === 'dark';
  const look =
    tone === 'hero'
      ? 'h-9 w-9 rounded-full bg-white/10 text-hero-ink backdrop-blur-sm transition hover:bg-white/20 active:scale-95'
      : tone === 'owner'
        ? 'h-9 w-9 rounded-lg bg-chip sm:h-10 sm:w-10'
        : 'h-10 w-10 rounded-md bg-chip';
  return (
    <button
      onClick={() => choose(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`grid flex-none place-items-center ${look}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}