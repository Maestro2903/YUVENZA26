-- ============================================================================
-- YUVENZA26 - migration 0003: structured event dates & times
--
-- Adds calendar date + start/end times to events so the admin can schedule
-- them with real pickers and the registration page can prevent time clashes.
-- The free-text date_label stays for display; the structured fields drive
-- clash detection.
--
-- Apply AFTER 0002 (paste into the Supabase SQL editor, or supabase db push).
-- ============================================================================

alter table public.events
  add column if not exists event_date date,
  add column if not exists start_time time,
  add column if not exists end_time time;

-- End must come after start when both are set.
alter table public.events
  drop constraint if exists events_time_order;
alter table public.events
  add constraint events_time_order
  check (start_time is null or end_time is null or end_time > start_time);

-- Schedule the seeded fest line-up (only rows that haven't been scheduled
-- yet, so admin edits are never clobbered on re-run).
update public.events set event_date = d, start_time = s, end_time = e
from (values
  ('hackathon',        date '2026-08-11', null::time,    null::time),
  ('design-sprint',    date '2026-08-11', time '10:00',  time '13:00'),
  ('canvas',           date '2026-08-11', time '14:00',  time '17:00'),
  ('frame-by-frame',   date '2026-08-11', null::time,    null::time),
  ('arena',            date '2026-08-12', time '10:00',  time '14:00'),
  ('the-great-debate', date '2026-08-12', time '15:00',  time '17:00'),
  ('battle-of-bands',  date '2026-08-12', time '18:00',  time '21:00'),
  ('run-for-kindness', date '2026-08-13', time '06:00',  time '09:00')
) as sched(slug, d, s, e)
where public.events.slug = sched.slug
  and public.events.event_date is null;
