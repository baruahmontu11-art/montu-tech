-- 0005_site_settings.sql — website settings + announcements (admin-managed).
-- Run after 0001–0004. Admin-only tables; no user-facing RLS policies.

create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.announcements enable row level security;

-- No public policies: both tables are read/written only via the service-role
-- client from /api/admin/settings (server-side is_admin check). This keeps
-- settings out of every user's RLS scope by design.

create index if not exists idx_announcements_active_created
  on public.announcements (is_active, created_at desc);

insert into public.site_settings (key, value) values
  ('site_name', 'Montu Tech'),
  ('site_tagline', 'All-in-One Facebook Management Platform'),
  ('support_email', 'support@montutech.example')
on conflict (key) do nothing;
