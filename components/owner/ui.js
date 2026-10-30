export function Switch({ checked, onChange, label, disabled = false, size = 'md' }) {
  const auto = size === 'auto'; // small on phones, normal size from 640px up
  const dims = size === 'sm' ? 'h-5 w-9' : auto ? 'h-5 w-9 sm:h-6 sm:w-11' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : auto ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-5 w-5';
  const shift = size === 'sm' ? 'translate-x-4' : auto ? 'translate-x-4 sm:translate-x-5' : 'translate-x-5';
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${done ? 'bg-okbg text-ok' : 'bg-warnbg text-warn'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-ok' : 'bg-warn'}`} />
      {done ? 'Completed' : 'Received'}
    </span>
  );
}

// `inline`: on phones keep the title and its action button on one row (use when there is a single button).
export function PageHeader({ title, subtitle, children, inline = false }) {
  return (
    <div className={`mb-4 flex items-end justify-between gap-2 sm:mb-5 sm:gap-3 ${inline ? 'sm:flex-wrap' : 'flex-wrap'}`}>
      <div className={`min-w-0 ${inline ? 'flex-1 sm:flex-none' : ''}`}>
        <h1 className="text-xl font-semibold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted sm:mt-1 sm:text-sm">{subtitle}</p>}
      </div>
      {children && <div className={`flex items-center gap-2 ${inline ? 'flex-none sm:flex-wrap' : 'flex-wrap'}`}>{children}</div>}
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
      className="no-scrollbar -mx-3 flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto sm:gap-2 overscroll-x-contain px-3 pb-1 [-webkit-overflow-scrolling:touch] sm:-mx-1 sm:px-1"
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
            className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm ${
              on ? 'border-accent bg-accent text-on-accent' : 'border-edge bg-card text-muted hover:text-ink'
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`min-w-5 rounded-full px-1.5 text-center text-[11px] tabular-nums sm:text-xs ${on ? 'bg-white/20 text-on-accent' : 'bg-chip text-muted'}`}>{o.count}</span>
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
        className="h-9 w-full rounded-xl border border-edge bg-card py-0 pl-9 pr-3 text-base sm:h-10 outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:ring-1 focus:ring-accent/40 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
  );
}

// Compact stat card (Orders page keeps the compact size; Menu page uses the same).
export function StatCard({ label, value, sub, align = 'center' }) {
  return (
    <div className={`min-w-0 rounded-xl border border-edge bg-card px-1 py-2 shadow-card sm:rounded-2xl sm:p-3 ${align === 'left' ? 'text-left' : 'text-center'}`}>
      <div className="truncate font-sans text-lg font-semibold leading-tight tabular-nums sm:text-2xl">{value}</div>
      <div className="truncate text-[10px] font-medium sm:text-xs">{label}</div>
      {sub && <div className="mt-0.5 hidden truncate text-[11px] text-muted sm:block">{sub}</div>}
    </div>
  );
}

// Big money figure for the Orders summary bar. tone: 'ok' (green) | 'warn' (amber) | undefined.
// Numbers use the sans font (Playfair's old-style digits look uneven at this size) and a fixed min-height so nothing jumps.
export function MoneyStat({ label, value, sub, tone }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="min-w-0 rounded-xl border border-edge bg-card p-2.5 shadow-card sm:rounded-2xl sm:p-4">
      <div className="truncate text-xs font-semibold text-muted sm:text-xs sm:uppercase sm:tracking-wide">{label}</div>
      <div className={`mt-0.5 truncate font-sans text-xl font-bold leading-tight tabular-nums sm:mt-1 sm:text-[1.75rem] ${color}`}>{value}</div>
      <div className="mt-0.5 line-clamp-2 min-h-7 text-[11px] leading-snug text-muted sm:mt-1 sm:min-h-4 sm:truncate sm:text-xs">{sub}</div>
    </div>
  );
}


// Grid / list switch used on the Owner Orders, Kitchen and Order history screens.
export function ViewToggle({ value, onChange, className = 'flex' }) {
  return (
    <div role="group" aria-label="Card layout" className={`${className} flex-none items-center gap-0.5 rounded-lg border border-edge bg-card p-0.5`}>
      {[
        ['grid', 'Grid view'],
        ['list', 'List view'],
      ].map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          aria-label={label}
          title={label}
          className={`grid h-8 w-8 place-items-center rounded-md transition-colors sm:h-9 sm:w-9 ${value === v ? 'bg-accent text-on-accent' : 'text-muted hover:bg-chip hover:text-ink'}`}
        >
          <Icon name={v} size={16} />
        </button>
      ))}
    </div>
  );
}

// Small Previous / Next bar under a long list. `pg` is what usePaged() returns. Hidden when everything fits on one page.
export function Pager({ pg }) {
  if (pg.pages <= 1) return null;
  const btn =
    'inline-flex h-8 items-center gap-1 rounded-lg border border-edge bg-card px-2.5 text-xs sm:h-9 sm:px-3 font-semibold transition-colors hover:bg-chip disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card';
  const go = (p) => {
    pg.go(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
      <button type="button" onClick={() => go(pg.page - 1)} disabled={pg.page <= 1} className={btn}>
        <Icon name="chevronLeft" size={14} /> Previous
      </button>
      <span className="text-center text-xs tabular-nums text-muted">
        {pg.from}–{pg.to} of {pg.total}
        <span className="hidden sm:inline"> · Page {pg.page} of {pg.pages}</span>
      </span>
      <button type="button" onClick={() => go(pg.page + 1)} disabled={pg.page >= pg.pages} className={btn}>
        Next <Icon name="chevronRight" size={14} />
      </button>
    </nav>
  );
}