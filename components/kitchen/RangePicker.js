'use client';
import Dropdown from '@/components/Dropdown';
import { ymd } from '@/lib/dateRange';

const OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'custom', label: 'Custom' },
];

const dateBox = 'h-10 w-full min-w-0 rounded-lg border border-edge bg-card px-3 text-sm font-semibold outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-1 focus:ring-accent/40';
const dateLabel = 'flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted';

// "Today / Yesterday / Custom" dropdown. Choosing Custom reveals a From and To date.
export default function RangePicker({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Dropdown variant="pill" align="left" value={value.key} onChange={(key) => set(key === 'custom' && !value.from ? { key, from: ymd(new Date()), to: ymd(new Date()) } : { key })} options={OPTIONS} ariaLabel="Date range" />
      {value.key === 'custom' && value.from && (
        <div className="grid basis-full grid-cols-2 gap-3 sm:basis-auto">
          <label className={dateLabel}>
            <span className="px-0.5">From</span>
            <input
              type="date"
              value={value.from}
              max={ymd(new Date())}
              onChange={(e) => e.target.value && set({ from: e.target.value, to: e.target.value > value.to ? e.target.value : value.to })}
              className={dateBox}
            />
          </label>
          <label className={dateLabel}>
            <span className="px-0.5">To</span>
            <input
              type="date"
              value={value.to}
              min={value.from}
              max={ymd(new Date())}
              onChange={(e) => e.target.value && set({ to: e.target.value })}
              className={dateBox}
            />
          </label>
        </div>
      )}
    </div>
  );
}