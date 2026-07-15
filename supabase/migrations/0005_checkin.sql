-- ============================================================================
-- YUVENZA26 - migration 0005: gate check-in tracking
--
-- The admin QR scanner marks an order checked-in on its first valid scan;
-- any later scan of the same pass warns staff that it was already used.
--
-- Apply AFTER 0004 (paste into the Supabase SQL editor, or supabase db push).
-- ============================================================================

alter table public.orders
  add column if not exists checked_in_at timestamptz;

create index if not exists idx_orders_checked_in_at on public.orders (checked_in_at);
