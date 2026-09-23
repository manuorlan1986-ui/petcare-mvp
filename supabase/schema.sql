-- PetCare Marketplace MVP schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.app_role as enum ('pet_parent','caregiver','admin');
create type public.service_type as enum ('walking','daycare');
create type public.booking_status as enum ('pending','accepted','declined','confirmed','in_progress','completed','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'pet_parent',
  avatar_url text,
  city text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id public.service_type primary key,
  name text not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.caregiver_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  bio text not null default '',
  years_experience int not null default 0 check (years_experience >= 0 and years_experience <= 80),
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count int not null default 0 check (review_count >= 0),
  public_status text not null default 'pending' check (public_status in ('pending','approved','suspended')),
  stripe_account_id text unique,
  stripe_onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caregiver_services (
  caregiver_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  service_type public.service_type not null references public.services(id),
  rate_cents integer not null check (rate_cents > 0),
  active boolean not null default true,
  primary key (caregiver_id, service_type)
);

create table public.platform_settings (
  id boolean primary key default true check (id),
  platform_fee_bps integer not null default 2000 check (platform_fee_bps between 0 and 10000),
  fixed_fee_cents integer not null default 0 check (fixed_fee_cents >= 0),
  payout_hold_days integer not null default 2 check (payout_hold_days between 0 and 30),
  currency text not null default 'usd' check (currency = 'usd'),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;
insert into public.services (id,name,description) values
  ('walking','Dog walking','30 or 60 minutes of personalized walking care.'),
  ('daycare','Day care','Daytime play, companionship and supervision.')
on conflict (id) do update set name=excluded.name, description=excluded.description;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  caregiver_id uuid not null references public.caregiver_profiles(id),
  service_type public.service_type not null references public.services(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  unit_count integer not null default 1 check (unit_count > 0 and unit_count <= 24),
  unit_price_cents integer not null default 0,
  total_amount_cents integer not null default 0,
  platform_fee_cents integer not null default 0,
  caregiver_amount_cents integer not null default 0,
  currency text not null default 'usd',
  status public.booking_status not null default 'pending',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  booking_id uuid references public.bookings(id),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index bookings_customer_idx on public.bookings(customer_id, start_at desc);
create index bookings_caregiver_idx on public.bookings(caregiver_id, start_at desc);
create index caregiver_services_type_idx on public.caregiver_services(service_type);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger caregiver_profiles_updated before update on public.caregiver_profiles for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.platform_settings for each row execute function public.set_updated_at();
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();

-- Auth -> profile bootstrap. Role is read from signup metadata but is constrained by the enum.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r public.app_role;
begin
  r := case when new.raw_user_meta_data->>'role' in ('caregiver','admin') then (new.raw_user_meta_data->>'role')::public.app_role else 'pet_parent'::public.app_role end;
  insert into public.profiles(id, display_name, role) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), r);
  if r = 'caregiver' then
    insert into public.caregiver_profiles(id, bio, public_status) values (new.id, '', 'pending');
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Server-side booking pricing. Client cannot choose the platform split.
create or replace function public.price_booking() returns trigger language plpgsql security definer set search_path = public as $$
declare
  rate integer;
  fee_bps integer;
  fixed_fee integer;
  gross integer;
begin
  select rate_cents into rate from public.caregiver_services
   where caregiver_id = new.caregiver_id and service_type = new.service_type and active = true;
  if rate is null then raise exception 'Caregiver does not offer this service'; end if;
  select platform_fee_bps, fixed_fee_cents into fee_bps, fixed_fee from public.platform_settings where id = true;
  gross := rate * new.unit_count;
  new.unit_price_cents := rate;
  new.total_amount_cents := gross;
  new.platform_fee_cents := round(gross * fee_bps / 10000.0)::integer + fixed_fee;
  new.caregiver_amount_cents := greatest(0, gross - new.platform_fee_cents);
  return new;
end; $$;

create trigger bookings_price before insert on public.bookings for each row execute function public.price_booking();

-- Public caregiver directory: only non-sensitive profile fields are exposed.
create or replace view public.caregiver_public with (security_invoker = true) as
select
  cp.id,
  p.display_name,
  p.city,
  p.state,
  p.avatar_url,
  cp.bio,
  cp.rating,
  cp.review_count,
  cp.years_experience,
  cp.stripe_onboarding_complete,
  coalesce(array_agg(cs.service_type order by cs.service_type) filter (where cs.active), '{}'::public.service_type[]) as services,
  coalesce(min(cs.rate_cents) filter (where cs.active),0)::numeric / 100.0 as hourly_rate
from public.caregiver_profiles cp
join public.profiles p on p.id=cp.id
left join public.caregiver_services cs on cs.caregiver_id=cp.id
where cp.public_status='approved'
group by cp.id,p.display_name,p.city,p.state,p.avatar_url,cp.bio,cp.rating,cp.review_count,cp.years_experience,cp.stripe_onboarding_complete;

grant select on public.caregiver_public to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.caregiver_profiles enable row level security;
alter table public.caregiver_services enable row level security;
alter table public.services enable row level security;
alter table public.platform_settings enable row level security;
alter table public.bookings enable row level security;
alter table public.payment_events enable row level security;

create policy "profiles own select" on public.profiles for select to authenticated using (id=auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "caregiver public approved" on public.caregiver_profiles for select to anon,authenticated using (public_status='approved');
create policy "caregiver own manage" on public.caregiver_profiles for all to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "caregiver services public approved" on public.caregiver_services for select to anon,authenticated using (exists(select 1 from public.caregiver_profiles cp where cp.id=caregiver_id and cp.public_status='approved'));
create policy "caregiver services own manage" on public.caregiver_services for all to authenticated using (caregiver_id=auth.uid()) with check (caregiver_id=auth.uid());
create policy "services public read" on public.services for select to anon,authenticated using (active=true);

create policy "bookings customer read" on public.bookings for select to authenticated using (customer_id=auth.uid() or caregiver_id=auth.uid());
create policy "bookings customer insert" on public.bookings for insert to authenticated with check (customer_id=auth.uid());
create policy "bookings caregiver update status" on public.bookings for update to authenticated using (caregiver_id=auth.uid()) with check (caregiver_id=auth.uid());

-- Only server-side functions should read/write payment event rows.
create policy "payment events none" on public.payment_events for all to authenticated using (false) with check (false);

-- Settings are not directly writable from the browser. Admin changes should use an Edge Function.
create policy "settings no client access" on public.platform_settings for all to authenticated using (false) with check (false);

-- Example admin bootstrap: after creating your first account, promote its role manually in SQL once.
-- update public.profiles set role='admin' where id='YOUR_USER_UUID';
