# SECURITY.md — MONTU TECH security model

This document states what the application does — and what it deliberately does **not** do. Security review should start here.

## 1. What we never do

- **Never collect or store Facebook passwords.** Login is OAuth only (authorization-code flow). There is no password field for Facebook anywhere.
- **Never expose the service-role key, Meta App Secret, Razorpay secret, or `TOKEN_ENCRYPTION_KEY` to the browser.** They are server-only env vars; frontend code must never import them.
- **Never commit secrets.** `.env*` (except `.env.example`, placeholders only) is git-ignored. If a real secret is ever committed, rotate it immediately.
- **Never let a user grant themselves admin.** `profiles.is_admin` can only be set with direct database access (SQL). There is no API route, form, or client call that sets it.
- **Never fabricate data.** Earnings, balances, payout history and metrics are shown only when the Meta API returns them; otherwise the UI says "unavailable".

## 2. Authentication & sessions (Supabase Auth)

- Email + password registration with email verification; forgot-password / reset via Supabase's emailed link.
- Sessions are managed by Supabase Auth with secure, HTTP-only cookies (`@supabase/ssr`). The client never handles raw session tokens in `localStorage`.
- Protected routes (`/dashboard/*`, `/admin/*`) check the session server-side; unauthenticated requests redirect to `/login`.
- Suspended users (`profiles.is_suspended = true`) are blocked server-side even with a valid session.
- Session expiry follows Supabase defaults; refresh tokens rotate server-side.

## 3. Row Level Security (RLS) — user data isolation

- **RLS is enabled on every table** (`0001–0003` migrations). The database, not just the API, enforces isolation.
- Default rule: a user can read/write only rows where `user_id = auth.uid()` (or `id = auth.uid()` for `profiles`). Admins can read all rows via the `public.is_admin()` check.
- `is_admin()` is a `SECURITY DEFINER` function that reads `profiles` directly, so policies do not recurse through `profiles`' own RLS.
- Writes that must be trustworthy (subscriptions, payments, published posts, insights, webhook events, audit logs) have **no client insert/update policy at all** — only the server (service role) writes them. Payments are created/updated only after server-side Razorpay verification.
- **Testing isolation:** log in as user A, try to fetch user B's page/post/ticket by ID through the API — the query must return 404 / empty, not B's data. Repeat for every table after any policy change. Do not ship a policy change without this test.

## 4. Facebook token encryption (AES-256-GCM)

- User and Page access tokens are encrypted **server-side** with AES-256-GCM before storage (`meta_connections.encrypted_token`, `facebook_pages.encrypted_page_token`). Ciphertext format: `base64(iv || authTag || ciphertext)` — the IV is random per token and the GCM tag authenticates it, so tampering is detected on decrypt.
- Key: `TOKEN_ENCRYPTION_KEY`, a 32-byte key as 64 hex characters (`openssl rand -hex 32`). Server-only env var.
- Tokens are decrypted only in memory, inside server-side code, for the single Graph API call that needs them — never logged, never returned to the client, never stored in a cookie.
- **Key rotation invalidates all stored tokens** (decryption fails → status becomes `token_expired` → user reconnects). Rotate only with a planned reconnect flow.
- Token expiry is monitored via `token_expires_at`; expired/revoked tokens are marked `expired`/`revoked` and the user is prompted to reconnect. Permission loss (e.g. `pages_manage_posts` removed) is surfaced as a `permission_lost` Page status, not silently retried forever.

## 5. Meta OAuth

- Authorization-code flow only; the code is exchanged **server-side** with the App Secret.
- `state` is a cryptographically random value stored in an HTTP-only cookie and validated on callback (CSRF protection). A mismatched or missing `state` aborts the login.
- Only the minimum permissions are requested, when needed: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`. No unnecessary scopes.
- Token exchange errors, revoked tokens and Graph API errors are handled and logged (`webhook_events` / `audit_logs`), and the user sees a clear reconnect prompt — never a stack trace.
- Graph API version comes from `META_GRAPH_API_VERSION` (default `v21.0`), never hardcoded in code, so a deprecated version can be moved by changing one env var.

## 6. CSRF, input validation & rate limiting

- **CSRF:** state-changing API routes require a valid Supabase session cookie; OAuth callbacks validate `state` (see §5). SameSite cookies are set by `@supabase/ssr`.
- **Input validation:** every API route validates its body with Zod schemas (`src/lib/validation/`) before touching the database or the Graph API. Invalid input is rejected with 400 and never reaches SQL or Meta.
- **Rate limiting:** auth endpoints (login, register, password reset), the Meta connect callback and publish endpoints are rate-limited server-side (per IP + per user). Repeated failures are logged and temporarily blocked.
- **Security headers:** `next.config.js` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and a restrictive `Permissions-Policy`.

## 7. Webhook signature verification

- **Razorpay:** every webhook is verified with HMAC-SHA256 against `RAZORPAY_WEBHOOK_SECRET` before processing. A payment is marked `captured` and a subscription activated **only** after signature verification — never on frontend confirmation. Unverified webhooks are rejected and logged. Duplicate deliveries are idempotent (unique `razorpay_payment_id` / order checks).
- **Meta:** webhook verification uses `META_WEBHOOK_VERIFY_TOKEN` on the GET challenge, and the `X-Hub-Signature-256` HMAC is verified against the App Secret on POST deliveries. Events are stored raw in `webhook_events` before processing, so a failed handler can be replayed.
- Both webhook routes are exempt from CSRF session checks (they are not browser calls) but require their provider's signature — no signature, no processing.

## 8. File uploads (support documents)

- Uploads go to the **private** Supabase Storage bucket `support-documents` only. The database stores only `storage_path` + metadata — never file bytes, never bank credentials in plain text.
- Server-side validation: allowed MIME types (PDF, JPG, PNG), size limits, and a path namespaced by user (`<user_id>/<uuid>.<ext>`) so one user cannot overwrite another's file.
- Downloads are served via short-lived **signed URLs** generated server-side after an ownership/admin check. The bucket is never public.
- Users should be told in the UI to redact full bank account numbers / passwords from documents before uploading.

## 9. Audit logging

- Sensitive actions are written to `audit_logs` (actor, role, action, entity, details, IP, timestamp): logins, Page connect/disconnect, publishes, ticket/payout status changes, admin actions (suspend/activate, plan changes), payment events.
- `audit_logs` is append-only for clients (admin SELECT only; inserts are server-side). It is the first place to look in an incident.

## 10. Data deletion (GDPR / Meta requirement)

- In-app: **Settings → Delete my account** (and the public `/data-deletion` page) starts the deletion workflow: the user confirms, the server revokes the Meta connection (Graph API token revocation), deletes stored tokens, Pages, posts, tickets and documents, then deletes the Supabase Auth user. `audit_logs` retains only anonymised entries needed for legal/fraud records.
- Meta data-deletion callback: the `/api/webhooks/meta` deletion endpoint handles Meta's data-deletion requests (signed request verification, confirmation code returned per Meta's spec).
- Deletion is irreversible and confirmed explicitly — it is never triggered by a single accidental click.

## 11. Incident checklist

1. Suspected leaked secret → **rotate it immediately** (Supabase service key, Meta App Secret, Razorpay keys, `TOKEN_ENCRYPTION_KEY` — in that order of blast radius), then check `audit_logs` / `webhook_events` for misuse.
2. Suspected account takeover → suspend the profile (`is_suspended = true`), revoke the user's Meta connection, force re-login.
3. Suspicious webhook traffic → check signature failures in logs; rotate the webhook secret if verification was bypassed.
4. After any incident, record what happened, what was rotated, and what changed, in `audit_logs` and in this file's history if the model changed.
