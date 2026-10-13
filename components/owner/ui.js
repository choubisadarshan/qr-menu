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
      className={`relative inline-flex flex-none items-center rounded-full transition-colors disabled:opacity-50 ${dims} ${checked ? 'bg-accent' : 'bg-line'}`}
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

// Filter tabs, e.g. All | Received | Completed. options: [{ value, label, count? }]
export function Tabs({ value, onChange, options, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl bg-chip p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex flex-none items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${value === o.value ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
          {o.count != null && (
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${value === o.value ? 'bg-okbg text-ok' : 'bg-line text-muted'}`}>{o.count}</span>
          )}
        </button>
      ))}
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
        className="w-full rounded-xl border border-line bg-card py-2.5 pl-9 pr-3 text-base outline-none transition-shadow duration-300 focus:ring-2 focus:ring-accent md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
  );
}


// Compact stat card (Orders page keeps the compact size; Menu page uses the same).
export function StatCard({ label, value, sub, align = 'center' }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-line bg-card p-3 shadow-card ${align === 'left' ? 'text-left' : 'text-center'}`}>
      <div className="truncate font-display text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      {sub && <div className="mt-0.5 hidden truncate text-[11px] text-muted sm:block">{sub}</div>}
    </div>
  );
}

// Big money figure for the Orders summary bar. tone: 'ok' (green) | 'warn' (amber) | undefined.
// Numbers use the sans font (Playfair's old-style digits look uneven at this size) and a fixed min-height so nothing jumps.
export function MoneyStat({ label, value, sub, tone }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink';
  const bar = tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-line';
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-line bg-card p-4 pl-5 shadow-card">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} />
      <div className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 truncate font-sans text-[1.7rem] font-bold leading-tight tabular-nums min-[420px]:text-3xl sm:text-4xl ${color}`}>{value}</div>
      <div className="mt-1 min-h-4 truncate text-xs text-muted">{sub}</div>
    </div>
  );
}

