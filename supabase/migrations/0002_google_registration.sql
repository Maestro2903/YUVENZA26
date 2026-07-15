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
