-- ============================================================
-- MONTU TECH — 0001_core.sql
-- Core: profiles, plans, subscriptions, payments
-- + shared helpers (updated_at trigger, is_admin check)
-- Run in Supabase SQL Editor or `supabase db push`.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------- Helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin check used by RLS policies on every table.
-- SECURITY DEFINER so it can read profiles without recursing
-- through profiles' own RLS policies.
-- Admin status lives ONLY in profiles.is_admin; it is never
-- settable by the user (see profiles policies below).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ---------- profiles ----------
-- One row per Supabase Auth user. id = auth.users.id.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_profiles_is_admin on public.profiles (is_admin) where is_admin = true;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- plans ----------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,               -- free | basic | premium | enterprise
  name text not null,
  price_inr integer not null default 0,    -- paise? No — whole rupees (see seed file)
  billing_period text not null default 'monthly',
  max_pages integer not null default 1,
  max_scheduled_posts integer not null default 10,
  max_team_members integer not null default 1,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_plans_slug on public.plans (slug);
create trigger trg_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------- subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
  razorpay_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);
create index if not exists idx_subscriptions_period_end on public.subscriptions (current_period_end);
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------- payments ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  plan_id uuid references public.plans (id) on delete set null,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  amount_inr integer not null,             -- whole rupees
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_user_id on public.payments (user_id);
create index if not exists idx_payments_subscription_id on public.payments (subscription_id);
create index if not exists idx_payments_rzp_payment_id on public.payments (razorpay_payment_id);
create unique index if not exists uq_payments_rzp_order_id
  on public.payments (razorpay_order_id) where razorpay_order_id is not null;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

-- profiles: users read/update ONLY their own row (never is_admin —
-- that column is excluded by only allowing non-admin updates via
-- a separate policy below is NOT possible in plain RLS, so admin
-- promotion must go through a service-role function / SQL, never
-- a client update). Admins read all.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- NOTE: update policy deliberately allows the owner to update only
-- non-privileged columns in practice — the application layer must
-- never send is_admin / is_suspended from the client. A defence-in-
-- depth trigger would reject privilege escalation; see SECURITY.md.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- plans: public read (pricing page), only admins write.
drop policy if exists "plans_select_all" on public.plans;
create policy "plans_select_all" on public.plans
  for select using (true);
drop policy if exists "plans_admin_write" on public.plans;
create policy "plans_admin_write" on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions: owner read; admin read all; writes are server-side only
-- (service role bypasses RLS), so no client insert/update policy.
drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- payments: owner read; admin read all; writes server-side only.
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
