'use client';
import { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/time';

// Shows a live-ticking "1h 12m 8s" since the given time.
export default function LiveSince({ since }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <>{formatDuration(now - new Date(since).getTime())}</>;
}