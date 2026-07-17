-- ============================================================================
-- YUVENZA26 - migration 0007: per-event gate check-in + operational fields
--
-- * checkin.verify permission: lets gate staff verify passes WITHOUT seeing
--   revenue or exports (create a "gate_staff" role with just this).
-- * order_checkins: one row per (order, event) scan, with who scanned it -
--   multi-event orders no longer trigger false re-use alarms at later events,
--   attendance is countable per event, and mis-scans can be undone.
-- * events.venue: where each event happens (shown on pages, passes, emails).
--
-- Apply AFTER 0006 (paste into the Supabase SQL editor, or supabase db push).
-- ============================================================================

insert into public.permissions (key, label, category) values
  ('checkin.verify', 'Verify passes & check in attendees', 'Gate')
on conflict (key) do update set label = excluded.label, category = excluded.category;

-- Grant to the built-in roles that run the fest (super_admin implicit anyway).
insert into public.role_permissions (role_id, permission_key)
select r.id, 'checkin.verify' from public.roles r
where r.name in ('super_admin', 'admin')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Per-event check-in records
-- ---------------------------------------------------------------------------
create table if not exists public.order_checkins (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  event_slug text not null,
  scanned_by uuid references public.profiles(id) on delete set null,
  scanned_at timestamptz not null default now(),
  unique (order_id, event_slug)
);

create index if not exists idx_order_checkins_event on public.order_checkins (event_slug);

alter table public.order_checkins enable row level security;
drop policy if exists "order_checkins_select" on public.order_checkins;
create policy "order_checkins_select" on public.order_checkins
  for select to authenticated
  using (public.has_permission('checkin.verify') or public.has_permission('payments.view'));
-- Writes go through the server (service role) after permission checks.

-- ---------------------------------------------------------------------------
-- Event venue
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists venue text;

update public.events set venue = v
from (values
  ('hackathon',        'Innovation Lab, Block C'),
  ('battle-of-bands',  'Main Stage, Open Grounds'),
  ('design-sprint',    'Design Studio, Block B'),
  ('frame-by-frame',   'Exhibition Hall'),
  ('arena',            'E-Sports Arena, Block A'),
  ('canvas',           'Art Room, Block B'),
  ('the-great-debate', 'Seminar Hall 1'),
  ('run-for-kindness', 'Campus Main Gate (start)')
) as sched(slug, v)
where public.events.slug = sched.slug
  and public.events.venue is null;

-- ---------------------------------------------------------------------------
-- Site announcement banner (editable in Admin -> Site sections)
-- ---------------------------------------------------------------------------
insert into public.site_content (key, data) values
  ('announcement', '{"enabled": false, "text": "", "linkLabel": "", "linkHref": ""}'::jsonb)
on conflict (key) do nothing;
