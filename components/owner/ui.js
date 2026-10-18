'use client';

/* Small shared pieces for the owner workspace (icons, switch, status pill, page header...). */

const PATHS = {
  coffee: <><path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M7 1v3M11 1v3M15 1v3" /></>,
  orders: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>,
  analytics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  menu: <><path d="M4 4h16v16H4Z" /><path d="M8 4v16M12 9h4M12 13h4" /></>,
  hamburger: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M21 14v.01M14 21h.01M17 21h4v-4" /></>,
  install: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></>,
  signout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  save: <><path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 17.5 9 5 9-5" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></>,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  grip: <><circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" /></>,
  chef: <><path d="M6 13.9V20h12v-6.1" /><path d="M6 13.9A4 4 0 0 1 7 6a5 5 0 0 1 10 0 4 4 0 0 1 1 7.9" /><path d="M6 17h12" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  volume: <><path d="M11 5 6 9H2v6h4l5 4Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>,
  volumeOff: <><path d="M11 5 6 9H2v6h4l5 4Z" /><path d="m22 9-6 6M16 9l6 6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  sliders: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-none ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}

export function Switch({ checked, onChange, label, disabled = false, size = 'md' }) {
  const dims = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const shift = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex flex-none items-center rounded-full transition-colors disabled:opacity-50 ${dims} ${checked ? 'bg-accent' : 'bg-edge'}`}
    >
      <span className={`ml-0.5 inline-block rounded-full bg-white shadow transition-transform ${knob} ${checked ? shift : ''}`} />
    </button>
  );
}

// Only two order statuses: Received (amber) and Completed (green).
export function StatusPill({ status }) {
  const done = status === 'completed';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${done ? 'bg-okbg text-ok' : 'bg-warnbg text-warn'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-ok' : 'bg-warn'}`} />
      {done ? 'Completed' : 'Received'}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// Filter chips, e.g. All | Received | Completed. options: [{ value, label, count? }]
// Same pill look as the Menu category filter. One row that scrolls sideways on every screen size and
// runs edge-to-edge on phones (negative margin = the page padding), so there is never a gap while scrolling.
export function Tabs({ value, onChange, options, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="no-scrollbar -mx-3 flex min-w-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-3 pb-1 [-webkit-overflow-scrolling:touch] sm:-mx-1 sm:px-1"
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={(e) => {
              onChange(o.value);
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
            aria-pressed={on}
            className={`flex flex-none items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              on ? 'border-accent bg-accent text-on-accent' : 'border-edge bg-card text-muted hover:text-ink'
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums ${on ? 'bg-white/20 text-on-accent' : 'bg-chip text-muted'}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Search field. `ref` goes to the outer label (used for "tap outside"), `inputRef` to the input.
// Text is 16px on phones so iOS does not zoom the page when the field is focused (that zoom looks like jank).
export function SearchBox({ value, onChange, placeholder, className = '', ref, inputRef, onFocus, onBlur }) {
  return (
    <label ref={ref} className={`relative block ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-edge bg-card py-0 pl-9 pr-3 text-base outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:ring-1 focus:ring-accent/40 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
  );
}

// Compact stat card (Orders page keeps the compact size; Menu page uses the same).
export function StatCard({ label, value, sub, align = 'center' }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-edge bg-card p-3 shadow-card ${align === 'left' ? 'text-left' : 'text-center'}`}>
      <div className="truncate font-sans text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      {sub && <div className="mt-0.5 hidden truncate text-[11px] text-muted sm:block">{sub}</div>}
    </div>
  );
}

// Big money figure for the Orders summary bar. tone: 'ok' (green) | 'warn' (amber) | undefined.
// Numbers use the sans font (Playfair's old-style digits look uneven at this size) and a fixed min-height so nothing jumps.
export function MoneyStat({ label, value, sub, tone }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="min-w-0 rounded-2xl border border-edge bg-card p-3.5 shadow-card sm:p-4">
      <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs">{label}</div>
      <div className={`mt-1 truncate font-sans text-2xl font-bold leading-tight tabular-nums sm:text-[1.75rem] ${color}`}>{value}</div>
      <div className="mt-1 min-h-4 truncate text-[11px] text-muted sm:text-xs">{sub}</div>
    </div>
  );
}
