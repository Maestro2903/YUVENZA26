-- ONE-SHOT SETUP for a FRESH project: paste into the Supabase SQL editor and Run.
-- (0001..0006 + seed. For an EXISTING database, run only the migration files
--  you haven't applied yet, in order.)

-- ============================================================================
-- YUVENZA26 - initial schema
-- Tables, RBAC helpers, Row Level Security and the media storage bucket.
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- RBAC: roles, permissions, profiles
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  key      text primary key,
  label    text not null,
  category text not null
);

create table if not exists public.role_permissions (
  role_id        uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role_id    uuid references public.roles(id) on delete set null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

create table if not exists public.case_studies (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  category    text not null,
  year        text not null,
  client      text,
  description text not null,
  story       text,
  live_site   text,
  cover_url   text,
  cover_alt   text,
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  category    text not null,
  date_label  text not null,
  -- Registration fee in INR (rupees). 0 = free entry.
  price       integer not null default 0 check (price >= 0),
  description text not null,
  slots       text,
  badge       text check (badge in ('Popular', 'New', 'Free')),
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Editable site sections (hero, statement, pillars, fest info, ...) as JSON.
create table if not exists public.site_content (
  key        text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- Application-wide settings. NEVER store secrets here - this table is
-- publicly readable. Secrets belong in app_secrets (encrypted, locked down).
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- Media library metadata; binaries live in the 'media' storage bucket.
create table if not exists public.media (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null default 'media',
  path       text not null unique,
  alt        text,
  caption    text,
  mime_type  text,
  size_bytes bigint,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments (Razorpay)
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  razorpay_order_id text unique,
  -- Amount in PAISE (Razorpay's unit): INR 299 = 29900.
  amount            integer not null check (amount >= 0),
  currency          text not null default 'INR',
  status            text not null default 'created'
                    check (status in ('created', 'pending', 'paid', 'failed', 'cancelled')),
  -- True when the order was recorded by the no-gateway demo/free flow.
  demo              boolean not null default false,
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text not null,
  customer_college  text,
  event_slugs       text[] not null default '{}',
  notes             jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  razorpay_payment_id text unique,
  status              text not null
                      check (status in ('authorized', 'captured', 'failed', 'refunded', 'pending')),
  method              text,
  amount              integer,
  error_reason        text,
  raw                 jsonb,
  created_at          timestamptz not null default now()
);

-- Encrypted secrets (AES-256-GCM ciphertext produced by the app with
-- APP_ENCRYPTION_KEY). RLS is enabled with NO policies: only the service role
-- can read or write. Values never reach the browser.
create table if not exists public.app_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_case_studies_published on public.case_studies (published, sort_order);
create index if not exists idx_events_published       on public.events (published, sort_order);
create index if not exists idx_orders_status          on public.orders (status);
create index if not exists idx_orders_created_at      on public.orders (created_at desc);
create index if not exists idx_orders_email           on public.orders (customer_email);
create index if not exists idx_payments_order_id      on public.payments (order_id);
create index if not exists idx_media_created_at       on public.media (created_at desc);
create index if not exists idx_profiles_role_id       on public.profiles (role_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_case_studies_updated_at on public.case_studies;
create trigger trg_case_studies_updated_at before update on public.case_studies
  for each row execute function public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create or replace function public.touch_site_row()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_site_content_touch on public.site_content;
create trigger trg_site_content_touch before insert or update on public.site_content
  for each row execute function public.touch_site_row();

drop trigger if exists trg_site_settings_touch on public.site_settings;
create trigger trg_site_settings_touch before insert or update on public.site_settings
  for each row execute function public.touch_site_row();

-- ---------------------------------------------------------------------------
-- RBAC helper functions (SECURITY DEFINER: they bypass RLS internally so they
-- can be used inside RLS policies without recursion).
-- ---------------------------------------------------------------------------

create or replace function public.current_role_name()
returns text
language sql stable security definer
set search_path = public
as $$
  select r.name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.has_permission(perm text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    left join public.role_permissions rp on rp.role_id = r.id
    where p.id = auth.uid()
      and p.is_active
      and (r.name = 'super_admin' or rp.permission_key = perm)
  )
$$;

grant execute on function public.current_role_name() to anon, authenticated, service_role;
grant execute on function public.has_permission(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- New-user handling: every signup gets a profile with the 'viewer' role.
-- Promote the first real owner with public.promote_to_super_admin (below).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  default_role uuid;
begin
  select id into default_role from public.roles where name = 'viewer';
  insert into public.profiles (id, email, full_name, role_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    default_role
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-time bootstrap helper. Run from the SQL editor (or via service role):
--   select public.promote_to_super_admin('you@example.com');
create or replace function public.promote_to_super_admin(user_email text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  target uuid;
  sa_role uuid;
begin
  select id into sa_role from public.roles where name = 'super_admin';
  if sa_role is null then
    raise exception 'super_admin role missing - run supabase/seed.sql first';
  end if;
  select id into target from public.profiles where lower(email) = lower(user_email);
  if target is null then
    raise exception 'No profile found for %. Sign the user up first.', user_email;
  end if;
  update public.profiles set role_id = sa_role, is_active = true where id = target;
end $$;

-- Only privileged contexts may call this - not the browser.
revoke execute on function public.promote_to_super_admin(text) from public, anon, authenticated;
grant execute on function public.promote_to_super_admin(text) to service_role;

-- ---------------------------------------------------------------------------
-- Defense-in-depth triggers
-- ---------------------------------------------------------------------------

-- Prevent privilege escalation through direct profile writes from the client:
--  * only users.manage may change role_id / is_active,
--  * only a super admin may grant (or revoke) the super_admin role.
-- Service-role connections (auth.uid() is null) bypass this; the app performs
-- its own checks before using the service client.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  sa_role uuid;
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.role_id is distinct from old.role_id) or (new.is_active is distinct from old.is_active) then
    if not public.has_permission('users.manage') then
      raise exception 'Not allowed to change roles or account status';
    end if;
    select id into sa_role from public.roles where name = 'super_admin';
    if (new.role_id = sa_role or old.role_id = sa_role)
       and coalesce(public.current_role_name(), '') <> 'super_admin' then
      raise exception 'Only a super admin can grant or revoke the super_admin role';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile_privileges on public.profiles;
create trigger trg_guard_profile_privileges before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Enforce content.publish at the database level: flipping `published` (or
-- inserting already-published rows) requires the dedicated permission.
create or replace function public.guard_publish_permission()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.published and not public.has_permission('content.publish') then
      raise exception 'Missing permission: content.publish';
    end if;
  elsif new.published is distinct from old.published then
    if not public.has_permission('content.publish') then
      raise exception 'Missing permission: content.publish';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_case_studies_publish_guard on public.case_studies;
create trigger trg_case_studies_publish_guard before insert or update on public.case_studies
  for each row execute function public.guard_publish_permission();

drop trigger if exists trg_events_publish_guard on public.events;
create trigger trg_events_publish_guard before insert or update on public.events
  for each row execute function public.guard_publish_permission();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles         enable row level security;
alter table public.case_studies     enable row level security;
alter table public.events           enable row level security;
alter table public.site_content     enable row level security;
alter table public.site_settings    enable row level security;
alter table public.media            enable row level security;
alter table public.orders           enable row level security;
alter table public.payments         enable row level security;
alter table public.app_secrets      enable row level security;
-- app_secrets: RLS on, NO policies -> service role only. Do not add policies.

-- roles / permissions: readable by any signed-in admin user (needed to render
-- the panel); writable only with roles.manage.
create policy "roles_select" on public.roles
  for select to authenticated using (true);
create policy "roles_write" on public.roles
  for all to authenticated
  using (public.has_permission('roles.manage'))
  with check (public.has_permission('roles.manage'));

create policy "permissions_select" on public.permissions
  for select to authenticated using (true);

create policy "role_permissions_select" on public.role_permissions
  for select to authenticated using (true);
create policy "role_permissions_write" on public.role_permissions
  for all to authenticated
  using (public.has_permission('roles.manage'))
  with check (public.has_permission('roles.manage'));

-- profiles: users always see their own; user managers see everyone.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_permission('users.manage'));
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.has_permission('users.manage'))
  with check (id = auth.uid() or public.has_permission('users.manage'));
-- (the guard_profile_privileges trigger stops role/status self-changes)

-- case_studies / events: the public site reads published rows anonymously;
-- admin users with content.view read everything.
create policy "case_studies_select" on public.case_studies
  for select using (published or public.has_permission('content.view'));
create policy "case_studies_insert" on public.case_studies
  for insert to authenticated with check (public.has_permission('content.create'));
create policy "case_studies_update" on public.case_studies
  for update to authenticated
  using (public.has_permission('content.edit'))
  with check (public.has_permission('content.edit'));
create policy "case_studies_delete" on public.case_studies
  for delete to authenticated using (public.has_permission('content.delete'));

create policy "events_select" on public.events
  for select using (published or public.has_permission('content.view'));
create policy "events_insert" on public.events
  for insert to authenticated with check (public.has_permission('content.create'));
create policy "events_update" on public.events
  for update to authenticated
  using (public.has_permission('content.edit'))
  with check (public.has_permission('content.edit'));
create policy "events_delete" on public.events
  for delete to authenticated using (public.has_permission('content.delete'));

-- site_content / site_settings: public read (the site renders from them),
-- guarded writes. Secrets never live here.
create policy "site_content_select" on public.site_content
  for select using (true);
create policy "site_content_write" on public.site_content
  for all to authenticated
  using (public.has_permission('content.edit'))
  with check (public.has_permission('content.edit'));

create policy "site_settings_select" on public.site_settings
  for select using (true);
create policy "site_settings_write" on public.site_settings
  for all to authenticated
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

-- media metadata: public read (alt text for rendered images), guarded writes.
create policy "media_select" on public.media
  for select using (true);
create policy "media_insert" on public.media
  for insert to authenticated with check (public.has_permission('media.upload'));
create policy "media_update" on public.media
  for update to authenticated
  using (public.has_permission('media.upload'))
  with check (public.has_permission('media.upload'));
create policy "media_delete" on public.media
  for delete to authenticated using (public.has_permission('media.delete'));

-- orders / payments: created exclusively by the server (service role bypasses
-- RLS); admin users need payments.view to read, payments.manage to amend.
create policy "orders_select" on public.orders
  for select to authenticated using (public.has_permission('payments.view'));
create policy "orders_update" on public.orders
  for update to authenticated
  using (public.has_permission('payments.manage'))
  with check (public.has_permission('payments.manage'));

create policy "payments_select" on public.payments
  for select to authenticated using (public.has_permission('payments.view'));

-- ---------------------------------------------------------------------------
-- Storage: public 'media' bucket for site imagery
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "media_objects_read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media_objects_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.has_permission('media.upload'));
create policy "media_objects_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.has_permission('media.upload'))
  with check (bucket_id = 'media' and public.has_permission('media.upload'));
create policy "media_objects_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.has_permission('media.delete'));

-- ============================================================================
-- YUVENZA26 - migration 0002: Google sign-in for event registration
--
-- Public visitors now sign in with Google (restricted to the college domain)
-- before registering for events. This is completely separate from the admin
-- panel: Google users get NO admin role and orders are linked to their
-- account so they can see their own tickets.
--
-- Apply AFTER 0001 (paste into the Supabase SQL editor, or supabase db push).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Orders belong to the signed-in visitor who placed them
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_user_id on public.orders (user_id);

-- Visitors can read their OWN orders (for "My registrations" + QR tickets).
-- Admin access is unchanged (payments.view policy from 0001).
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Registration settings (public, editable in Admin -> Settings)
--   allowedEmailDomain: Google accounts must belong to this domain ('*' = any)
--   requireLogin:       checkout demands a signed-in user
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('registration', '{"allowedEmailDomain": "citchennai.net", "requireLogin": true}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Enforce the domain restriction AT THE DATABASE for Google signups.
-- The client-side `hd` hint is spoofable; this trigger is not. It only
-- applies to the Google provider - admin accounts (email/password, created
-- from the admin panel) are unaffected.
-- ---------------------------------------------------------------------------
create or replace function public.guard_registration_email_domain()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  allowed text;
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google' then
    return new;
  end if;
  select value ->> 'allowedEmailDomain' into allowed
  from public.site_settings where key = 'registration';
  allowed := coalesce(nullif(trim(allowed), ''), 'citchennai.net');
  if allowed = '*' then
    return new;
  end if;
  if lower(coalesce(new.email, '')) not like '%@' || lower(allowed) then
    raise exception 'Only @% Google accounts can register.', allowed;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_google_domain on auth.users;
create trigger trg_guard_google_domain
  before insert on auth.users
  for each row execute function public.guard_registration_email_domain();

-- ---------------------------------------------------------------------------
-- New signups no longer receive a default admin-panel role.
--
-- 0001 gave every new auth user the 'viewer' role - fine when the only users
-- were staff, but Google-authenticated visitors must NOT get admin-panel
-- access of any kind. Roles are now assigned only explicitly (Admin -> Users
-- or promote_to_super_admin). Role-less users are turned away from /admin.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end $$;

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

-- ============================================================================
-- YUVENZA26 - seed data
-- Permission catalog, default roles, and the site's current content so the
-- database starts exactly where the static site left off.
-- Idempotent: content inserts use ON CONFLICT DO NOTHING (re-running never
-- clobbers admin edits); the permission catalog and default role grants are
-- upserted.
-- Run AFTER supabase/migrations/0001_initial_schema.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Permission catalog (mirror of lib/rbac/permissions.ts)
-- ---------------------------------------------------------------------------
insert into public.permissions (key, label, category) values
  ('content.view',    'View content',                  'Content'),
  ('content.create',  'Create content',                'Content'),
  ('content.edit',    'Edit content',                  'Content'),
  ('content.delete',  'Delete content',                'Content'),
  ('content.publish', 'Publish / unpublish content',   'Content'),
  ('media.view',      'View media library',            'Media'),
  ('media.upload',    'Upload / replace media',        'Media'),
  ('media.delete',    'Delete media',                  'Media'),
  ('payments.view',   'View orders & payments',        'Payments'),
  ('payments.manage', 'Manage payment configuration',  'Payments'),
  ('users.manage',    'Manage users',                  'Administration'),
  ('roles.manage',    'Manage roles & permissions',    'Administration'),
  ('settings.manage', 'Manage site settings',          'Administration')
on conflict (key) do update set label = excluded.label, category = excluded.category;

-- ---------------------------------------------------------------------------
-- Default roles
-- ---------------------------------------------------------------------------
insert into public.roles (name, description, is_system) values
  ('super_admin', 'Full access to every feature, setting, user, role and permission.', true),
  ('admin',       'Manages content, media, users and payments. Cannot change roles or payment credentials.', true),
  ('editor',      'Creates and edits content and media. Cannot publish, delete or administer.', true),
  ('viewer',      'Read-only access to the admin panel.', true)
on conflict (name) do nothing;

-- super_admin: every permission (also implicit via has_permission, but kept
-- explicit so the roles UI shows the full grant).
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.name = 'super_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, perm from public.roles r,
unnest(array[
  'content.view','content.create','content.edit','content.delete','content.publish',
  'media.view','media.upload','media.delete',
  'payments.view','users.manage','settings.manage'
]) as perm
where r.name = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, perm from public.roles r,
unnest(array['content.view','content.create','content.edit','media.view','media.upload']) as perm
where r.name = 'editor'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, perm from public.roles r,
unnest(array['content.view','media.view','payments.view']) as perm
where r.name = 'viewer'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Case studies (the /work initiatives)
-- ---------------------------------------------------------------------------
insert into public.case_studies
  (slug, title, category, year, client, description, story, sort_order, published)
values
  (
    'blind-school-visit', 'Blind School Visit', 'Community', '2024',
    'Victoria Memorial Blind School',
    $t$A morning spent with the students of Victoria Memorial Blind School. We arrived with supplies, essentials and, most of all, our time, sitting with the children, listening to their stories and sharing an afternoon of music, games and companionship.$t$,
    $t$We wanted this to be more than a donation drop. The team pooled funds raised at our own events, put together everyday essentials the school had asked for and simply showed up to spend the day. What the students remembered was not the supplies but the company, and that is exactly the point of everything Yuvenza does.$t$,
    0, true
  ),
  (
    'girl-child-home', 'Girl Child Home', 'Care', '2023', null,
    $t$A Christmas with the girls of a local child home shelter. We turned a season of giving into a day of belonging, decorations, gifts, a shared meal and a room full of laughter for children who deserve every bit of it.$t$,
    $t$Christmas can feel very far away when you do not have a home to celebrate it in. So the club adopted a girl child home for the season, funded gifts and a festive spread from our event proceeds, and spent the day making sure every child felt seen. Small acts of kindness, we keep learning, make the biggest difference.$t$,
    1, true
  ),
  (
    'poverty-awareness', 'Poverty Awareness', 'Campaign', '2024', null,
    $t$A campus wide campaign confronting poverty eradication head on. Through talks, drives and student led fundraising, we turned awareness into action and channelled every rupee raised straight back to the people who need it.$t$,
    $t$Awareness only matters when it moves. We built the campaign around simple, honest conversations, then paired them with a fundraising push across campus. The money we gathered went directly to relief, and the volunteers we recruited stayed on for the drives that followed.$t$,
    2, true
  ),
  (
    'braille-awareness', 'Braille Awareness', 'Inclusion', '2024', null,
    $t$An accessibility and Braille awareness initiative built to make the world a little more reachable for everyone. Workshops, hands on demos and student volunteers came together to put inclusion on the campus agenda.$t$,
    $t$Most students had never touched a line of Braille. We changed that with hands on sessions, guest speakers and a campaign that reframed accessibility as everyone's responsibility. By the end, inclusion was not a topic we talked about once, it was a habit the campus carried forward.$t$,
    3, true
  ),
  (
    'green-drive', 'Green Campus Drive', 'Environment', '2024', null,
    $t$An environmental responsibility drive that started on campus and carried into the city. From clean ups to planting to waste awareness, we rallied students behind a greener, more conscious Chennai.$t$,
    $t$We treated the environment like any other cause worth fighting for, with people and momentum. Students signed up in numbers, we organised clean ups and green sessions, and the energy spilled well beyond the college gates. What we create, we contribute, and here what we created was a cleaner shared space.$t$,
    4, true
  ),
  (
    'youth-mentoring', 'Youth Mentoring', 'Empowerment', '2023', null,
    $t$A mentoring programme guiding fellow students through leadership, growth and personal development. Peer to peer, honest and hands on, built to turn potential into purpose.$t$,
    $t$The best mentors are often just a few steps ahead. We paired students with peers and seniors, ran sessions on leadership and personal growth, and created a space where asking for guidance felt normal. Empowering young people to lead is how this club renews itself every single year.$t$,
    5, true
  ),
  (
    'flagship-fest', 'Flagship Fest', 'Event', '2024', null,
    $t$Our flagship fest, the loudest expression of igniting passion, creativity and unity. A campus wide celebration whose every ticket, stall and performance fuels the causes we back all year round.$t$,
    $t$The fest is where the whole club comes alive. Months of planning turn into a few unforgettable days of performances, stalls and community, and behind the celebration is a purpose, every bit of what the fest raises flows straight into our social initiatives. Create, and contribute.$t$,
    6, true
  ),
  (
    'community-fundraiser', 'Community Fundraiser', 'Fundraising', '2023', null,
    $t$The engine behind it all. A student run fundraiser that gathers the resources for every visit, drive and campaign we take on, proof that a campus united can back real causes.$t$,
    $t$Nothing we do happens without funds, and we refuse to let that be a barrier. Students organised, promoted and ran the whole thing, and the community showed up. Every rupee raised was accounted for and directed to a cause, because what we create, we contribute.$t$,
    7, true
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Events (fest line-up; dates follow the Aug 2026 fest window)
-- ---------------------------------------------------------------------------
insert into public.events
  (slug, title, category, date_label, event_date, start_time, end_time, price, description, slots, capacity, badge, sort_order, published)
values
  ('hackathon', 'Hackathon 24', 'Technology', 'Aug 11-12', date '2026-08-11', null, null, 299,
   $t$A 24-hour build sprint where teams ship something that matters. Mentors on tap, midnight chai included.$t$,
   '120 slots', 120, 'Popular', 0, true),
  ('battle-of-bands', 'Battle of Bands', 'Culture', 'Aug 12', date '2026-08-12', time '18:00', time '21:00', 199,
   $t$The loudest night of the fest. Bring your band, own the stage and play for the crowd.$t$,
   '16 bands', 16, null, 1, true),
  ('design-sprint', 'Design Sprint', 'Workshop', 'Aug 11', date '2026-08-11', time '10:00', time '13:00', 149,
   $t$A hands-on studio session on brand, type and interface, run by working designers.$t$,
   '60 seats', 60, 'New', 2, true),
  ('frame-by-frame', 'Frame by Frame', 'Photography', 'Aug 11-12', date '2026-08-11', null, null, 99,
   $t$A campus-wide photography contest on the theme of kindness. Shoot, submit, get exhibited.$t$,
   'Open entry', null, null, 3, true),
  ('arena', 'The Arena', 'eSports', 'Aug 12', date '2026-08-12', time '10:00', time '14:00', 149,
   $t$Squad up for the fest gaming tournament. Brackets, big screens and bragging rights.$t$,
   '32 teams', 32, null, 4, true),
  ('canvas', 'Canvas', 'Art & Craft', 'Aug 11', date '2026-08-11', time '14:00', time '17:00', 79,
   $t$A live art and craft contest. Paints, paper and a few hours to make something beautiful.$t$,
   '80 seats', 80, null, 5, true),
  ('the-great-debate', 'The Great Debate', 'Literary', 'Aug 12', date '2026-08-12', time '15:00', time '17:00', 0,
   $t$Free and open floor. Take a side, make your case and change a few minds.$t$,
   '48 speakers', 48, 'Free', 6, true),
  ('run-for-kindness', 'Run for Kindness', 'Fundraiser', 'Aug 13', date '2026-08-13', time '06:00', time '09:00', 249,
   $t$A 5K charity run to close the fest. Every rupee raised goes straight to our community drives.$t$,
   '300 runners', 300, null, 7, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Editable site sections
-- In text values, *x* renders the letter with the serif accent style (f-span)
-- and a literal newline renders as a line break.
-- ---------------------------------------------------------------------------
insert into public.site_content (key, data) values
  ('hero', $json$
    {
      "kickerLeft": "The Youth Club · Chennai Institute of Technology",
      "kickerRight": "Est. 2023",
      "tagline": "Igniting passion, creativity & unity.",
      "lead": "Yuvenza is the student-driven youth club of Chennai Institute of Technology. What we create, we contribute. Every event and campaign we run channels real support back to the community around us.",
      "primaryCta": { "label": "Register for the fest", "href": "/registration" },
      "secondaryCta": { "label": "Our Work", "href": "/work" },
      "tertiaryCta": { "label": "Join the club", "href": "https://www.instagram.com/yuvenza_cit/" },
      "facts": [
        "Aug 11-13 · CIT Campus, Chennai",
        "8 events · open to all colleges",
        "Every fee funds our social causes"
      ]
    }
  $json$::jsonb),
  ('statement', $json$
    {
      "heading": "The Youth\nP*o*wered Club",
      "body": "Since 2023, we've rallied students at Chennai Institute of Technology behind social causes, driving real impact and awareness through kindness. From blind-school visits to poverty, Braille and environmental drives."
    }
  $json$::jsonb),
  ('manifesto', $json$
    {
      "body": "We believe in the power of youth to create meaningful change. Every event and initiative we run channels funds and energy straight back into social causes that make a real difference. Small acts of kindness make the biggest difference.",
      "tagline": "Create & Contribute"
    }
  $json$::jsonb),
  ('pillars', $json$
    {
      "heading": "What we stand f*_o*r",
      "items": [
        { "num": "01", "title": "Passion", "body": "Everything starts with students who care. We turn raw energy into events, campaigns and drives that mean something." },
        { "num": "02", "title": "Creativity", "body": "We design our own way of giving back, blending fresh ideas with hands-on work so every initiative feels alive." },
        { "num": "03", "title": "Unity", "body": "Change is a team sport. We rally the campus together and move as one behind the causes that matter." }
      ]
    }
  $json$::jsonb),
  ('workSection', $json$
    {
      "kickerLeft": "Selected Work",
      "kickerRight": "Scroll to explore →",
      "heading": "Our W*_o*rk",
      "lead": "The events, campaigns and community initiatives we've shaped so far."
    }
  $json$::jsonb),
  ('eventsSection', $json$
    {
      "kickerLeft": "What's On",
      "heading": "Ev*_e*nts",
      "lead": "Pick the entries you want, register in one go, and every fee flows straight into the causes we back."
    }
  $json$::jsonb),
  ('quotes', $json$
    {
      "heading": "In their w*_o*rds",
      "items": [
        { "text": "Yuvenza turned our energy into purpose. Every event we run gives straight back to a cause that matters.", "name": "The Core Team", "role": "Yuvenza · CIT" },
        { "text": "Igniting passion, creativity and unity, that's the spirit we carry into every campaign and drive.", "name": "Our Volunteers", "role": "Community Outreach" },
        { "text": "What we create, we contribute. It isn't just a line, it's how every member shows up.", "name": "The Council", "role": "Chennai Institute of Technology" }
      ]
    }
  $json$::jsonb),
  ('stats', $json$
    {
      "items": [
        { "num": "2023", "label": "Founded at CIT" },
        { "num": "2.1K+", "label": "Strong community" },
        { "num": "9", "label": "Causes backed" },
        { "num": "100%", "label": "Student led" }
      ]
    }
  $json$::jsonb),
  ('join', $json$
    {
      "kicker": "Let's create change together",
      "heading": "J*_o*in the movement"
    }
  $json$::jsonb),
  ('fest', $json$
    {
      "name": "The Flagship Fest",
      "dateLabel": "Aug 2026",
      "venue": "CIT Campus, Chennai",
      "countdownTarget": "2026-08-11T00:00:00+05:30",
      "countdownDateLabel": "August 11"
    }
  $json$::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Site settings (public - never store secrets here)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('general', $json$
    {
      "siteName": "Yuvenza · The Youth Club",
      "siteDescription": "Yuvenza is the youth club of Chennai Institute of Technology, igniting passion, creativity and unity, and channelling every event and campaign we create into real social impact for the community.",
      "instagramUrl": "https://www.instagram.com/yuvenza_cit/",
      "linkedinUrl": "https://www.linkedin.com/company/yuvenza-cit/",
      "locationLabel": "Chennai, India"
    }
  $json$::jsonb),
  ('payments', $json$
    { "enabled": true }
  $json$::jsonb),
  ('registration', $json$
    { "allowedEmailDomain": "citchennai.net", "requireLogin": true }
  $json$::jsonb)
on conflict (key) do nothing;
