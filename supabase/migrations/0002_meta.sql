-- ============================================================
-- MONTU TECH — 0002_meta.sql
-- Meta / Facebook: connections, pages, posts, insights, webhooks
-- Facebook access tokens are stored ENCRYPTED (AES-256-GCM) by
-- the server in meta_connections.encrypted_token — never plaintext,
-- never readable from the client (no SELECT policy exposes it;
-- only the service role / server reads it).
-- ============================================================

-- ---------- meta_connections ----------
-- One row per user per Facebook login. A user may reconnect; the
-- latest active connection is the one the server uses.
create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  facebook_user_id text not null,
  -- AES-256-GCM ciphertext (base64), produced server-side only.
  encrypted_token text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_meta_connections_user_id on public.meta_connections (user_id);
create index if not exists idx_meta_connections_fb_user_id on public.meta_connections (facebook_user_id);
create index if not exists idx_meta_connections_status on public.meta_connections (status);
create trigger trg_meta_connections_updated_at
  before update on public.meta_connections
  for each row execute function public.set_updated_at();

-- ---------- facebook_pages ----------
create table if not exists public.facebook_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  connection_id uuid not null references public.meta_connections (id) on delete cascade,
  page_id text not null,
  name text not null,
  category text,
  picture_url text,
  -- Page access token, also AES-256-GCM encrypted server-side.
  encrypted_page_token text,
  followers_count integer,
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'token_expired', 'permission_lost')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_id)
);
create index if not exists idx_facebook_pages_user_id on public.facebook_pages (user_id);
create index if not exists idx_facebook_pages_page_id on public.facebook_pages (page_id);
create index if not exists idx_facebook_pages_status on public.facebook_pages (status);
create trigger trg_facebook_pages_updated_at
  before update on public.facebook_pages
  for each row execute function public.set_updated_at();

-- ---------- scheduled_posts ----------
create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  page_id uuid not null references public.facebook_pages (id) on delete cascade,
  content text not null,
  media_urls text[] not null default '{}',
  media_type text not null default 'text'
    check (media_type in ('text', 'photo', 'video')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_for timestamptz,
  published_post_id text,              -- Meta post id once published
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_scheduled_posts_user_id on public.scheduled_posts (user_id);
create index if not exists idx_scheduled_posts_page_id on public.scheduled_posts (page_id);
create index if not exists idx_scheduled_posts_status on public.scheduled_posts (status);
-- Worker query: due, scheduled posts ordered by time.
create index if not exists idx_scheduled_posts_due
  on public.scheduled_posts (scheduled_for)
  where status = 'scheduled';
create trigger trg_scheduled_posts_updated_at
  before update on public.scheduled_posts
  for each row execute function public.set_updated_at();

-- ---------- published_posts ----------
create table if not exists public.published_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  page_id uuid not null references public.facebook_pages (id) on delete cascade,
  scheduled_post_id uuid references public.scheduled_posts (id) on delete set null,
  meta_post_id text not null,
  content text,
  media_type text not null default 'text'
    check (media_type in ('text', 'photo', 'video')),
  permalink_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meta_post_id)
);
create index if not exists idx_published_posts_user_id on public.published_posts (user_id);
create index if not exists idx_published_posts_page_id on public.published_posts (page_id);
create index if not exists idx_published_posts_published_at on public.published_posts (published_at desc);
create trigger trg_published_posts_updated_at
  before update on public.published_posts
  for each row execute function public.set_updated_at();

-- ---------- page_insights ----------
-- Only metrics actually returned by the Graph API are stored.
-- Missing metrics are shown as "unavailable" in the UI — never fabricated.
create table if not exists public.page_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  page_id uuid not null references public.facebook_pages (id) on delete cascade,
  metric text not null,                -- e.g. page_impressions, page_engaged_users
  period text not null default 'day',  -- day | week | days_28
  value numeric,
  end_time timestamptz,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_page_insights_user_page on public.page_insights (user_id, page_id);
create index if not exists idx_page_insights_metric_period on public.page_insights (metric, period, end_time desc);
create unique index if not exists uq_page_insights_snapshot
  on public.page_insights (page_id, metric, period, end_time);

-- ---------- webhook_events ----------
-- Raw Meta webhook deliveries, for audit + idempotent processing.
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'meta', -- meta | razorpay
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_webhook_events_source_type on public.webhook_events (source, event_type);
create index if not exists idx_webhook_events_processed on public.webhook_events (processed) where processed = false;
create index if not exists idx_webhook_events_received_at on public.webhook_events (received_at desc);

-- ============================================================
-- Row Level Security — user isolation on every table.
-- Tokens are NOT exposed to clients: there is deliberately NO
-- select policy on meta_connections / facebook_pages that a
-- browser client could use to read encrypted tokens; the server
-- (service role) reads them. Dashboard reads of pages go through
-- API routes that strip token columns before responding.
-- ============================================================
alter table public.meta_connections enable row level security;
alter table public.facebook_pages enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.published_posts enable row level security;
alter table public.page_insights enable row level security;
alter table public.webhook_events enable row level security;

-- meta_connections: owner + admin only. No client INSERT/UPDATE —
-- connections are created server-side during the OAuth callback.
drop policy if exists "meta_connections_select_own_or_admin" on public.meta_connections;
create policy "meta_connections_select_own_or_admin" on public.meta_connections
  for select using (user_id = auth.uid() or public.is_admin());

-- facebook_pages: owner read; admin read all; disconnect (update
-- status) allowed for the owner; creation is server-side only.
drop policy if exists "facebook_pages_select_own_or_admin" on public.facebook_pages;
create policy "facebook_pages_select_own_or_admin" on public.facebook_pages
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "facebook_pages_update_own" on public.facebook_pages;
create policy "facebook_pages_update_own" on public.facebook_pages
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- scheduled_posts: full CRUD for the owner; admin read all.
drop policy if exists "scheduled_posts_owner_all" on public.scheduled_posts;
create policy "scheduled_posts_owner_all" on public.scheduled_posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "scheduled_posts_admin_select" on public.scheduled_posts;
create policy "scheduled_posts_admin_select" on public.scheduled_posts
  for select using (public.is_admin());

-- published_posts: owner read; admin read all; writes server-side only.
drop policy if exists "published_posts_select_own_or_admin" on public.published_posts;
create policy "published_posts_select_own_or_admin" on public.published_posts
  for select using (user_id = auth.uid() or public.is_admin());

-- page_insights: owner read; admin read all; writes server-side only.
drop policy if exists "page_insights_select_own_or_admin" on public.page_insights;
create policy "page_insights_select_own_or_admin" on public.page_insights
  for select using (user_id = auth.uid() or public.is_admin());

-- webhook_events: admin only (contains raw payloads).
drop policy if exists "webhook_events_admin_select" on public.webhook_events;
create policy "webhook_events_admin_select" on public.webhook_events
  for select using (public.is_admin());
