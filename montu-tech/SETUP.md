# SETUP.md — Local setup for MONTU TECH

Follow the steps in order. Nothing here needs a real secret pasted into chat or committed to git.

## Prerequisites

- Node.js **18.18+** (20 LTS recommended) and npm
- A Supabase account (free tier is fine) — https://supabase.com
- A Meta developer account — https://developers.facebook.com
- A Razorpay account (test mode first) — https://razorpay.com
- Git

## 1. Clone and install

```bash
git clone <your-repo-url> montu-tech
cd montu-tech
npm install
```

## 2. Environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in each value. Every variable is a placeholder in `.env.example` — replace them, never commit `.env.local` (it is git-ignored).

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → `service_role` key — **server only** |
| `META_APP_ID` / `META_APP_SECRET` | Meta app (step 4) |
| `META_GRAPH_API_VERSION` | `v21.0` (or newer when Meta releases one — change the env var, not code) |
| `META_REDIRECT_URI` | `http://localhost:3000/api/meta/callback` locally |
| `META_WEBHOOK_VERIFY_TOKEN` | Any random string you invent; must match the Meta app setting |
| `TOKEN_ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` (64 hex chars = 32 bytes). **Rotating it invalidates stored Facebook tokens — users must reconnect.** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Settings → API Keys (use **test** keys locally) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Settings → Webhooks → add secret |

## 3. Supabase project + migrations

1. Create a project at https://supabase.com/dashboard (free tier).
2. Copy the Project URL + anon key + service-role key into `.env.local` (step 2).
3. Apply the migrations — either:
   - **CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - **SQL Editor:** run `supabase/migrations/0001_core.sql`, `0002_meta.sql`, `0003_support.sql`, `0004_seed_plans.sql` in that order (see `supabase/README.md`).
4. Create the private storage bucket for support documents (SQL Editor):
   ```sql
   insert into storage.buckets (id, name, public)
   values ('support-documents', 'support-documents', false)
   on conflict (id) do nothing;
   ```
5. Verify: `select * from public.plans;` should return Free / Basic / Premium / Enterprise.
6. **Auth settings** (Dashboard → Authentication → Providers → Email): keep **Confirm email** ON, so registration → verification is tested the same way as production. Set the Site URL to `http://localhost:3000` locally (production URL in production).

## 4. Create the Meta app + OAuth redirect URI

1. Go to https://developers.facebook.com/apps → **Create App** → choose **Other** → **Business** type (a Facebook Login app for Page management).
2. Add the **Facebook Login** product, and (for webhooks) the **Webhooks** product.
3. Facebook Login → Settings → **Valid OAuth Redirect URIs** — add exactly:
   - Local: `http://localhost:3000/api/meta/callback`
   - Production: `https://<your-railway-domain>/api/meta/callback`
   
   The value must match `META_REDIRECT_URI` character-for-character, or Meta will reject the callback.
4. Copy the **App ID** and **App Secret** (Settings → Basic) into `.env.local`. The App Secret is server-only.
5. Permissions: request only `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` when the feature needs them. In development mode only app admins / test users can connect; public use requires **Meta App Review** for each permission (see `README.md`).
6. Webhooks (optional, for page/feed changes): subscribe to the `page` object, set the Verify Token to your `META_WEBHOOK_VERIFY_TOKEN`, and point the callback URL at `https://<your-domain>/api/webhooks/meta`.
7. Fill in the app's **Privacy Policy URL**, **Terms URL** and **Data Deletion Instructions URL** — they must point at the live pages of this app (`/privacy`, `/terms`, `/data-deletion`). Meta requires them for review.

## 5. Razorpay keys

1. Razorpay Dashboard → Settings → API Keys → generate **test** keys; paste into `.env.local`.
2. Settings → Webhooks → add an endpoint `http://localhost:3000/api/webhooks/razorpay` (use a tunnel such as `ngrok` for local testing, or test webhooks only after deploying) with events `payment.captured`, `payment.failed`, `subscription.*`. Copy the webhook secret into `.env.local`.
3. **Never mark a payment successful from the frontend.** The server verifies the Razorpay signature on the callback and again on the webhook; only then is `payments.status` set to `captured` and the subscription activated.

## 6. Run the app

```bash
# Terminal 1 — web app
npm run dev
# → http://localhost:3000

# Terminal 2 — scheduled-posts worker (needed for scheduler testing)
npm run worker
```

## 7. Smoke test

1. Register a new account → confirm the verification email → log in. You should land on the dashboard with an empty state (no fake Pages).
2. **Facebook connect (dev mode):** log in with a Facebook account that is an admin/tester of your Meta app, connect a Page you manage, and confirm the Page name + ID appear in Pages Manager.
3. Create a draft post, then a scheduled post 2 minutes out — with the worker running, it should publish and appear under Published Posts.
4. Check the admin gate: visiting `/admin` as a normal user must be denied. To make yourself admin, run in the Supabase SQL Editor:
   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```
   There is no self-serve way to become admin — by design.
5. Run the checks: `npm run typecheck` and `npm run lint` should pass; `npm run build` should complete before any deploy.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Invalid redirect_uri` on Facebook login | `META_REDIRECT_URI` does not exactly match the URI registered in the Meta app |
| `OAuthException (#200)` on publish | Missing `pages_manage_posts` approval, or the Page token expired — reconnect the Page |
| Supabase `row-level security` errors on reads | User is not logged in, or the row belongs to another user — check `auth.uid()` and the policies in `supabase/migrations/` |
| Worker publishes nothing | Worker not running, or `scheduled_for` is in the future / status is not `scheduled` — check `scheduled_posts` rows and worker logs |
| Razorpay payment stays `created` | Webhook not delivered (local dev needs a tunnel) or signature verification failed — check webhook logs in the Razorpay dashboard |
