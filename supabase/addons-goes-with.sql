-- Add-ons: which dishes an add-on is suggested with.
-- Run once in Supabase > SQL Editor. Safe to run again.
-- Empty list ([]) = the add-on is suggested with every dish.
alter table public.menu_items
  add column if not exists goes_with jsonb not null default '[]'::jsonb;
