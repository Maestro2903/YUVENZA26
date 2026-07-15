-- ============================================================================
-- YUVENZA26 - migration 0004: live slot availability + rich event pages
--
-- * events gain capacity (max registrations), a 4:3 image and a long-form
--   details write-up (all editable in the admin panel).
-- * event_registrations keeps a live per-event counter of PAID registrations,
--   maintained by a trigger on orders and streamed to browsers over Supabase
--   Realtime - no polling, no refresh.
--
-- Apply AFTER 0003 (paste into the Supabase SQL editor, or supabase db push).
-- ============================================================================

alter table public.events
  add column if not exists capacity integer check (capacity is null or capacity >= 0),
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists details text,
  add column if not exists rules text; -- one rule per line, shown on /events/[slug]

-- ---------------------------------------------------------------------------
-- Live registration counters (one row per event slug)
-- ---------------------------------------------------------------------------
create table if not exists public.event_registrations (
  event_slug text primary key,
  registered integer not null default 0 check (registered >= 0),
  updated_at timestamptz not null default now()
);

alter table public.event_registrations enable row level security;
drop policy if exists "event_registrations_select" on public.event_registrations;
create policy "event_registrations_select" on public.event_registrations
  for select using (true);
-- No insert/update/delete policies: only the trigger (definer) writes.

create or replace function public.bump_event_registrations(slugs text[], delta integer)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if delta > 0 then
    insert into public.event_registrations (event_slug, registered, updated_at)
    select s, delta, now() from unnest(slugs) as s
    on conflict (event_slug) do update
      set registered = public.event_registrations.registered + excluded.registered,
          updated_at = now();
  elsif delta < 0 then
    update public.event_registrations
      set registered = greatest(0, registered + delta), updated_at = now()
      where event_slug = any (slugs);
  end if;
end $$;

-- Keep counters in sync with paid orders (insert, status change, delete).
create or replace function public.sync_event_registrations()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'paid' then
      perform public.bump_event_registrations(new.event_slugs, 1);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if coalesce(old.status, '') <> 'paid' and new.status = 'paid' then
      perform public.bump_event_registrations(new.event_slugs, 1);
    elsif old.status = 'paid' and new.status <> 'paid' then
      perform public.bump_event_registrations(old.event_slugs, -1);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.status = 'paid' then
      perform public.bump_event_registrations(old.event_slugs, -1);
    end if;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists trg_orders_sync_registrations on public.orders;
create trigger trg_orders_sync_registrations
  after insert or update of status or delete on public.orders
  for each row execute function public.sync_event_registrations();

-- Maintenance helper: rebuild every counter from the orders table.
create or replace function public.refresh_event_registrations()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.event_registrations;
  insert into public.event_registrations (event_slug, registered, updated_at)
  select slug, count(*), now()
  from public.orders, unnest(event_slugs) as slug
  where status = 'paid'
  group by slug;
end $$;

revoke execute on function public.refresh_event_registrations() from public, anon, authenticated;
grant execute on function public.refresh_event_registrations() to service_role;

-- Backfill counters from existing paid orders.
select public.refresh_event_registrations();

-- Stream counter changes to browsers (Supabase Realtime).
do $$
begin
  alter publication supabase_realtime add table public.event_registrations;
exception
  when duplicate_object then null;
end $$;

-- Capacities for the seeded line-up (derived from the old slots labels;
-- only filled where the admin hasn't set one).
update public.events set capacity = c
from (values
  ('hackathon',        120),
  ('battle-of-bands',   16),
  ('design-sprint',     60),
  ('arena',             32),
  ('canvas',            80),
  ('the-great-debate',  48),
  ('run-for-kindness', 300)
) as caps(slug, c)
where public.events.slug = caps.slug
  and public.events.capacity is null;
