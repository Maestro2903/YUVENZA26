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
