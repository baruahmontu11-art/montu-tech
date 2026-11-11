# Supabase — MONTU TECH

Migrations live in `migrations/` and are applied in filename order:

| File | Contents |
| --- | --- |
| `0001_core.sql` | `profiles`, `plans`, `subscriptions`, `payments`, `is_admin()` + `set_updated_at()` helpers, RLS |
| `0002_meta.sql` | `meta_connections`, `facebook_pages`, `scheduled_posts`, `published_posts`, `page_insights`, `webhook_events`, RLS |
| `0003_support.sql` | `support_tickets`, `payout_requests`, `support_documents`, `notifications`, `audit_logs`, RLS |
| `0004_seed_plans.sql` | Free ₹0 / Basic ₹499 / Premium ₹999 / Enterprise ₹2499 plans |

## Option A — Supabase CLI (recommended)

```bash
# from the project root (~/workspace/montu-tech)
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`db push` applies any migration not yet recorded in `supabase_migrations.schema_migrations`.

## Option B — SQL Editor (no CLI)

1. Open the Supabase Dashboard → your project → **SQL Editor**.
2. Run `0001_core.sql`, then `0002_meta.sql`, then `0003_support.sql`, then `0004_seed_plans.sql` — **in that order**. `0001` must run first: later files depend on `profiles`, `is_admin()` and `set_updated_at()`.
3. Verify: `select * from public.plans;` should show 4 rows.

## Storage bucket

Support documents are stored in a **private** bucket. Create it once (SQL Editor):

```sql
insert into storage.buckets (id, name, public)
values ('support-documents', 'support-documents', false)
on conflict (id) do nothing;
```

Files are served only through signed URLs generated server-side. Do not make this bucket public.

## Making the first admin

Admin status is `profiles.is_admin`. There is **no UI or API that lets a user grant themselves admin** — set it in SQL only, after the user has registered:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

## Local development

```bash
npx supabase start   # local Postgres + Studio on http://localhost:54323
npx supabase db push # applies migrations to the local database
npx supabase stop
```

Local credentials are printed by `supabase start`; put them in `.env.local` (see `SETUP.md`).
