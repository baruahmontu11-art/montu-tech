# MONTU TECH

**All-in-One Facebook Management Platform**

> Simplify Facebook Page Management, Creator Analytics and Payout Support in One Platform.

MONTU TECH is a multi-user, multi-tenant SaaS that lets creators and small businesses connect their Facebook Pages, publish and schedule posts, track analytics, manage comments, and get help with payout issues — all from one dashboard. It uses **only the official Meta Facebook Graph API**. No passwords are collected, no session cookies are harvested, and no data is fabricated.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes + a standalone background worker (`workers/scheduled-posts/`) |
| Database | Supabase PostgreSQL (Row Level Security on every table) |
| Auth | Supabase Auth (email/password, email verification, password reset) |
| Facebook | Meta Graph API (configurable version via `META_GRAPH_API_VERSION`, default `v21.0`) |
| Payments | Razorpay (server-side verification + webhook signature verification) |
| Hosting | Railway — two services: `web` + `worker` |
| Validation | Zod |

## Architecture (text diagram)

```
                    ┌─────────────────────────┐
                    │   User's browser        │
                    │  (Next.js pages, no     │
                    │   secrets in the client)│
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │  Railway — web service  │
                    │  Next.js 14             │
                    │  /api/auth  /api/meta   │
                    │  /api/posts /api/support│
                    │  /api/billing /api/webhooks
                    └────┬──────────────┬─────┘
                         │              │
            ┌────────────▼─────┐  ┌─────▼──────────────┐
            │ Supabase         │  │ Meta Graph API     │
            │ Postgres + Auth  │  │ OAuth, Pages,      │
            │ + Storage        │  │ posts, insights    │
            │ (RLS everywhere) │  │ (AES-256-GCM       │
            └────────┬─────────┘  │  encrypted tokens) │
                     │            └────────────────────┘
            ┌────────▼─────────┐
            │ Railway — worker │
            │ scheduled-posts  │
            │ (polls DB,       │
            │  publishes due   │
            │  posts via Graph │
            │  API, retries)   │
            └──────────────────┘
```

**Data flow in one line:** browser → Next.js API route (auth-checked, Zod-validated) → Supabase (RLS) / Graph API (server-side, encrypted token) → response. The service-role key and Meta App Secret never leave the server.

## Features by phase

### Phase 1 — Foundation ✅ (scaffolded in this repo)
- Public website: Home, Features, Pricing, About, Contact, Login, Register, Privacy Policy, Terms of Service, Data Deletion Instructions
- Supabase Auth: registration, email verification, login/logout, forgot/reset password, protected dashboard routes, profile management
- Database migrations `0001–0004` (see `supabase/`)
- User dashboard shell + admin foundation (admin gated by `profiles.is_admin`, set only in SQL)

### Phase 2 — Meta integration
- Facebook OAuth (authorization-code flow, `state` validation, server-side token exchange)
- Connect multiple Pages, store permitted Page info (name, ID, category, picture)
- Token encryption (AES-256-GCM), expiry monitoring, reconnect / disconnect
- Permissions requested only when needed: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`

### Phase 3 — Content Studio & scheduler
- Text / photo / video posts, preview, drafts, publish, schedule
- Calendar + publishing queue, retry failed jobs
- Background worker (`npm run worker`) publishes due posts even when the user closes the browser

### Phase 4 — Analytics, comments, Messenger
- Page reach, engagement, impressions, followers, post/video performance, charts, date filters, weekly/monthly reports — **only metrics actually returned by authorized Graph API endpoints; unavailable metrics are labelled as such**
- Comments manager (retrieve permitted comments, reply, supported interactions)
- Messenger integration only where approved by Meta

### Phase 5 — Monetization & payout assistance
- Monetization dashboard: eligible earnings insights and status **where supported by the API — never fabricated**
- Payout Assistance module: support-request workflow for payout owner-name, DOB, business-type corrections, bank onboarding issues and payout-source transfers, with document upload, status tracking and admin replies

### Phase 6 — Subscriptions, admin, launch
- Free / Basic / Premium / Enterprise plans, Razorpay checkout, billing history
- Admin dashboard: users, tickets, payout requests, subscriptions, payments, announcements, audit logs, API config status, website settings
- Security testing, Railway deployment (see `RAILWAY_DEPLOY.md`)

## What needs Meta App Review

These permissions are **not** granted to a new Meta app by default. The app works in development mode with test users / Pages owned by the app's admins; production use by the general public requires Meta App Review and approval for each permission:

| Permission | Used for | Status |
| --- | --- | --- |
| `pages_show_list` | List Pages the user manages | Requires App Review for public use |
| `pages_read_engagement` | Read Page insights / engagement | Requires App Review for public use |
| `pages_manage_posts` | Publish posts to Pages | Requires App Review for public use |

Until approval, connect flows, publishing and insights will return permission errors for non-test users — the app surfaces those errors honestly instead of showing fake data. The Data Deletion Instructions page and Meta webhook verification are part of the review requirements; see `SETUP.md`.

## What is NOT possible via the Meta API (honest limits)

- **There is no public Graph API endpoint to directly modify bank details, payout ownership, date of birth, tax details, or transfer payout sources.** Payout setup and changes happen only inside Facebook's own UI (Professional Dashboard / Business Suite → Monetization → Payouts) or via Meta support.
- The **Payout Assistance module is therefore a documented support / request-management workflow** (ticket + documents + admin help), not an automated change to a Meta account. The UI must never claim otherwise.
- **No earnings, balances, payout history or monetization eligibility are fabricated.** If the API does not return a metric, the dashboard says "unavailable", not a made-up number.
- No Facebook passwords are ever collected or stored. Login is OAuth only.

## Quick start

```bash
cp .env.example .env.local   # fill in your keys — never commit .env.local
npm install
npm run dev                  # http://localhost:3000
npm run worker               # in a second terminal, for scheduled posts
```

Full steps: [`SETUP.md`](SETUP.md) · Deployment: [`RAILWAY_DEPLOY.md`](RAILWAY_DEPLOY.md) · Security model: [`SECURITY.md`](SECURITY.md) · Database: [`supabase/README.md`](supabase/README.md)

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Next.js lint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run worker` | Scheduled-posts background worker (`tsx workers/scheduled-posts/index.ts`) |

## Project structure

```
src/
  app/            (marketing)/ (auth)/ dashboard/ admin/ api/...
  components/     ui/ dashboard/ sidebar/ forms/ charts/
  lib/            supabase/ meta/ security/ payments/ validation/
  services/ hooks/ types/
supabase/         migrations/ config.toml README.md
workers/          scheduled-posts/
```

## License

Proprietary — MONTU TECH. All rights reserved.
