'use client';
import { useState } from 'react';

// Only this many orders are drawn at once, so a busy day (or "All time") never slows the screen down.
export const PAGE_SIZE = 20;

// Splits a list into pages of 20. `resetKey` changes whenever the search / filter / date range changes,
// which sends the list back to page 1. The page number is always kept inside the real range.
export function usePaged(items, resetKey, size = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const pages = Math.max(1, Math.ceil(items.length / size));
  const wanted = state.key === resetKey ? state.page : 1;
  const page = Math.min(Math.max(1, wanted), pages);
  const start = (page - 1) * size;

  return {
    page,
    pages,
    total: items.length,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + size, items.length),
    slice: items.slice(start, start + size),
    go: (p) => setState({ key: resetKey, page: Math.min(Math.max(1, p), pages) }),
  };
}

// Remembers a grid / list choice on this device.
export function readView(storageKey, fallback) {
  try {
    const v = localStorage.getItem(storageKey);
    return v === 'grid' || v === 'list' ? v : fallback;
  } catch {
    return fallback;
  }
}
export function saveView(storageKey, value) {
  try {
    localStorage.setItem(storageKey, value);
  } catch {}
}