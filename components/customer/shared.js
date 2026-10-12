'use client';

// The standard Indian veg / non-veg mark: a small square with a dot.
export function VegMark({ veg = true, small = false }) {
  const box = small ? 'h-3.5 w-3.5 p-[1px]' : 'h-4 w-4 p-[2px]';
  const dot = small ? 'h-1.5 w-1.5' : 'h-2 w-2';
  return (
    <span
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`inline-flex flex-none items-center justify-center rounded-[3px] border bg-white ${box} ${veg ? 'border-ok' : 'border-nonveg'}`}
    >
      <span className={`${dot} rounded-full ${veg ? 'bg-ok' : 'bg-nonveg'}`} />
    </span>
  );
}

// Thin gold line - diamond - thin gold line
export function Ornament({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 opacity-70 ${className}`} aria-hidden="true">
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold" />
      <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold" />
    </div>
  );
}

// Dish photo, or the emoji if there is no photo yet
export function Thumb({ m, className = 'h-16 w-16 text-2xl' }) {
  return (
    <div className={`flex flex-none select-none items-center justify-center overflow-hidden rounded-tile bg-chip ${className}`}>
      {m.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{m.emoji || '🍽️'}</span>
      )}
    </div>
  );
}

export function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function CheckIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export const priceDelta = (n, money) => (n > 0 ? `+${money(n)}` : n < 0 ? `−${money(-n)}` : 'Free');