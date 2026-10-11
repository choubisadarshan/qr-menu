'use client';
import { useTheme } from '@/lib/useTheme';

// Makes sure the saved theme is applied on every page, even if the early script did not run.
export default function ThemeSync() {
  useTheme();
  return null;
}