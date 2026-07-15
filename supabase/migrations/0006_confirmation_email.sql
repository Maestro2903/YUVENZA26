-- ============================================================================
-- YUVENZA26 - migration 0006: confirmation-email bookkeeping
--
-- The app claims this timestamp atomically before sending the registration
-- confirmation email, so the verify route and the Razorpay webhook can race
-- without ever double-sending.
--
-- Apply AFTER 0005 (paste into the Supabase SQL editor, or supabase db push).
-- ============================================================================

alter table public.orders
  add column if not exists confirmation_email_sent_at timestamptz;
