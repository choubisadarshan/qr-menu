'use client';
import { useEffect, useState } from 'react';

const two = (n) => String(n).padStart(2, '0');

// "02m 14s" while under an hour, "1h 05m" after that.
export function formatTimer(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${two(m)}m` : `${two(m)}m ${two(s)}s`;
}

// Live-ticking waiting time. Turns amber after 15 minutes so slow orders stand out.
export default function OrderTimer({ since, className = '' }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = now - new Date(since).getTime();
  return <span className={`${ms >= 15 * 60000 ? 'text-warn' : 'text-ok'} ${className}`}>{formatTimer(ms)}</span>;
}