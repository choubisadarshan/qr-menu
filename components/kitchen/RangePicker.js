'use client';
import Dropdown from '@/components/Dropdown';
import { ymd } from '@/lib/dateRange';

const OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'custom', label: 'Custom' },
];

const dateBox = 'min-h-10 w-full min-w-0 rounded-lg border border-edge bg-card px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent';

// "Today / Yesterday / Custom" dropdown. Choosing Custom reveals a From and To date.
export default function RangePicker({ value, onChange }) {
  const max = ymd(new Date());
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Dropdown variant="pill" align="left" value={value.key} onChange={(key) => set({ key })} options={OPTIONS} ariaLabel="Date range" />
      {value.key === 'custom' && (
        <div className="grid basis-full grid-cols-2 gap-2 sm:basis-auto">
          <label className="min-w-0 text-xs text-muted">
            From
            <input
              type="date"
              value={value.from}
              max={max}
              onChange={(e) => e.target.value && set({ from: e.target.value, to: e.target.value > value.to ? e.target.value : value.to })}
              className={dateBox}
            />
          </label>
          <label className="min-w-0 text-xs text-muted">
            To
            <input
              type="date"
              value={value.to}
              min={value.from}
              max={max}
              onChange={(e) => e.target.value && set({ to: e.target.value })}
              className={dateBox}
            />
          </label>
        </div>
      )}
    </div>
  );
}
