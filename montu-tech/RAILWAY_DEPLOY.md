# RAILWAY_DEPLOY.md — Deploying MONTU TECH on Railway

Railway hosts two services from this one repo. Both must be running in production: the **web** service alone cannot publish scheduled posts while the user is away.

## Architecture on Railway

| Service | Source | Build | Start | Notes |
| --- | --- | --- | --- | --- |
| `web` | Same GitHub repo | `npm run build` (Nixpacks) | `npm start` | Next.js app, healthcheck `GET /api/health` |
| `worker` | Same GitHub repo | `npm install` (no Next build needed) | `npm run worker` | Long-running `tsx` process, polls `scheduled_posts` |

## 1. Push the code to GitHub

```bash
git init && git add . && git commit -m "Montu Tech — initial"
git remote add origin https://github.com/<you>/montu-tech.git
git push -u origin main
```

`.env.local` is git-ignored — secrets are set in Railway, never in the repo.

## 2. Create the Railway project

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → select `montu-tech`.
2. Railway creates the first service — name it **`web`**.
3. **Add a second service** from the same repo: New → GitHub Repo → same repo → name it **`worker`**.
4. In the `worker` service → Settings → change the **Start Command** to `npm run worker` and remove/override the build command to `npm install` (it does not need `next build`). Leave the `web` service on the defaults (`npm run build` / `npm start`, as in `railway.json` / `railway.toml`).

## 3. Environment variables (set on BOTH services, with production values)

Set these in Railway → each service → **Variables**. Use the **same values** on `web` and `worker` (the worker needs Supabase + token-encryption access too).

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://<your-railway-domain>` (see §4) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (**never** expose client-side) |
| `META_APP_ID` / `META_APP_SECRET` | Meta app credentials |
| `META_GRAPH_API_VERSION` | `v21.0` |
| `META_REDIRECT_URI` | `https://<your-railway-domain>/api/meta/callback` — must match the URI registered in the Meta app exactly |
| `META_WEBHOOK_VERIFY_TOKEN` | Same random string as in the Meta app webhook settings |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -hex 32` output — set once, do not rotate casually (rotation invalidates stored Facebook tokens) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | **Live** keys only when you are ready to take real payments; test keys before that |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret for `https://<your-domain>/api/webhooks/razorpay` |
| `NODE_ENV` | `production` (Railway sets this automatically) |
| `PORT` | Railway injects this automatically — do not hardcode 3000 |

After changing `META_REDIRECT_URI` / `NEXT_PUBLIC_APP_URL`, also update:
- Meta app → Facebook Login → Valid OAuth Redirect URIs (add the production URI).
- Supabase Dashboard → Authentication → URL Configuration → Site URL = production domain.
- Meta app → Privacy Policy / Terms / Data Deletion URLs = production `/privacy`, `/terms`, `/data-deletion` pages.
- Razorpay webhooks → production webhook URL.

## 4. Domain + HTTPS

1. `web` service → Settings → **Networking** → **Generate Domain** (Railway gives `https://<name>.up.railway.app`). HTTPS is automatic.
2. For a custom domain: add it under **Custom Domain**, then add the CNAME at your DNS provider as Railway shows. Wait for DNS + certificate provisioning before testing Facebook login (Meta requires HTTPS redirect URIs in production).
3. Use the final domain everywhere in §3 — a mismatch breaks OAuth and Supabase redirects.

## 5. Health check

`railway.json` sets `healthcheckPath: /api/health` on the web service. Railway restarts the service if it stops responding. Verify after deploy:

```bash
curl https://<your-railway-domain>/api/health
# expected: {"status":"ok", ...} with HTTP 200
```

The worker has no HTTP endpoint — Railway restarts it on crash (`restartPolicyType: ON_FAILURE`, max 10 retries). Watch its logs instead (see §6).

## 6. Logs and monitoring

- Railway → service → **Deployments** → **View Logs** for build/start output.
- `web` logs: Next.js requests, API errors, webhook deliveries.
- `worker` logs: each polling cycle, posts published, failures and retries. A post stuck in `publishing` or repeatedly `failed` shows up here first — check `scheduled_posts.error_message` in Supabase too.
- Supabase Dashboard → Table Editor → `webhook_events` / `audit_logs` for an audit trail of Meta and Razorpay events.

## 7. Graceful shutdown

- The Next.js server stops on `SIGTERM` (Railway sends it on redeploy/scale-down); in-flight requests finish or fail fast — API routes are short-lived by design.
- The worker handles `SIGTERM`/`SIGINT` by finishing the current publish attempt (or marking it for retry) before exiting, so a redeploy does not silently lose a scheduled post. Do not `kill -9` the worker in production.

## 8. Deploy flow (every release)

```bash
git push origin main        # Railway auto-deploys both services
```

- If a release changes the database, apply the new migration first (`npx supabase db push` against the production project), then deploy the code that depends on it.
- Verify after each deploy: `/api/health` → 200, log in, open the dashboard, and check the worker logs for one polling cycle.

## 9. Trial-credit warning (read before you rely on this)

Railway's free trial is **credit-limited and time-limited (trial credit, not free forever)** — when the trial credit runs out, services are suspended until a payment method is added or the project is moved. Before launch:

- Check Railway → Usage to see remaining trial credit and burn rate (the worker runs 24/7, so it consumes credits continuously).
- Add a payment method / upgrade to a paid plan **before** the trial expires, or the live site and the scheduler will stop without warning.
- Keep the Supabase free tier limits in mind too (database size, auth users, storage) — the app is designed to run on free tiers for testing, not for large-scale production.

## Rollback

Railway → service → **Deployments** → pick the previous successful deployment → **Redeploy**. If the bad release included a migration, rolling back code alone does not undo the migration — write a compensating migration instead of editing history.
