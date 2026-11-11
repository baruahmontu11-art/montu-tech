-- ============================================================
-- MONTU TECH — 0003_support.sql
-- Support: tickets, payout assistance, documents, notifications,
-- audit logs.
--
-- HONEST SCOPE NOTE: Meta offers NO public API to directly modify
-- bank details, payout ownership, date of birth, tax details or
-- transfer payout sources. The payout_requests table below is a
-- SUPPORT / REQUEST-MANAGEMENT workflow (a ticket an admin reviews
-- and helps the user resolve through Meta's own UI / support),
-- NOT an automated change to a Meta account.
-- ============================================================

-- ---------- support_tickets ----------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  category text not null default 'general'
    check (category in ('general', 'payout', 'publishing', 'billing', 'account', 'other')),
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'in_progress', 'waiting_for_information', 'completed', 'rejected')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_support_tickets_user_id on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status on public.support_tickets (status);
create index if not exists idx_support_tickets_created_at on public.support_tickets (created_at desc);
create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ---------- payout_requests ----------
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  page_id uuid references public.facebook_pages (id) on delete set null,
  request_type text not null
    check (request_type in (
      'payout_owner_name_correction',
      'date_of_birth_correction',
      'business_type_correction',
      'bank_onboarding_issue',
      'payout_source_transfer',
      'other'
    )),
  details text not null,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'in_progress', 'waiting_for_information', 'completed', 'rejected')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payout_requests_user_id on public.payout_requests (user_id);
create index if not exists idx_payout_requests_page_id on public.payout_requests (page_id);
create index if not exists idx_payout_requests_status on public.payout_requests (status);
create index if not exists idx_payout_requests_type on public.payout_requests (request_type);
create trigger trg_payout_requests_updated_at
  before update on public.payout_requests
  for each row execute function public.set_updated_at();

-- ---------- support_documents ----------
-- Files live in Supabase Storage (bucket `support-documents`,
-- private). This table stores only the storage path + metadata —
-- never the file bytes, never bank credentials in plain text.
create table if not exists public.support_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ticket_id uuid references public.support_tickets (id) on delete cascade,
  payout_request_id uuid references public.payout_requests (id) on delete cascade,
  storage_path text not null,          -- e.g. <user_id>/<uuid>.pdf
  file_name text not null,
  mime_type text,
  file_size_bytes integer,
  created_at timestamptz not null default now(),
  -- A document belongs to exactly one ticket OR one payout request.
  check (
    (ticket_id is not null and payout_request_id is null)
    or (ticket_id is null and payout_request_id is not null)
  )
);
create index if not exists idx_support_documents_user_id on public.support_documents (user_id);
create index if not exists idx_support_documents_ticket_id on public.support_documents (ticket_id);
create index if not exists idx_support_documents_payout_request_id on public.support_documents (payout_request_id);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info'
    check (type in ('info', 'success', 'warning', 'error')),
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_id on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id) where is_read = false;

-- ---------- audit_logs ----------
-- Append-only in practice: no client UPDATE/DELETE policy.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  actor_role text not null default 'user'
    check (actor_role in ('user', 'admin', 'system', 'worker')),
  action text not null,                -- e.g. user.login, page.disconnect, payout.status_change
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_user_id on public.audit_logs (user_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.support_tickets enable row level security;
alter table public.payout_requests enable row level security;
alter table public.support_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- support_tickets: owner CRUD (create + read own); admin read + update status/reply.
drop policy if exists "support_tickets_owner_all" on public.support_tickets;
create policy "support_tickets_owner_all" on public.support_tickets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "support_tickets_admin_all" on public.support_tickets;
create policy "support_tickets_admin_all" on public.support_tickets
  for all using (public.is_admin()) with check (public.is_admin());

-- payout_requests: same shape as tickets.
drop policy if exists "payout_requests_owner_all" on public.payout_requests;
create policy "payout_requests_owner_all" on public.payout_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "payout_requests_admin_all" on public.payout_requests;
create policy "payout_requests_admin_all" on public.payout_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- support_documents: owner read/insert; admin read all. Deletes server-side.
drop policy if exists "support_documents_owner_read" on public.support_documents;
create policy "support_documents_owner_read" on public.support_documents
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "support_documents_owner_insert" on public.support_documents;
create policy "support_documents_owner_insert" on public.support_documents
  for insert with check (user_id = auth.uid());

-- notifications: owner read + mark-read; admin read all; inserts server-side.
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_logs: admin read only; inserts are server-side (service role).
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.is_admin());
