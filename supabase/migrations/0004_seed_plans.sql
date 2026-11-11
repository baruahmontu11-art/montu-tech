-- ============================================================
-- MONTU TECH — 0004_seed_plans.sql
-- Seed subscription plans. Safe to re-run (ON CONFLICT DO UPDATE).
-- Prices are whole rupees per month.
-- ============================================================

insert into public.plans
  (slug, name, price_inr, billing_period, max_pages, max_scheduled_posts, max_team_members, features)
values
  ('free', 'Free', 0, 'monthly', 1, 10, 1,
   '["1 Facebook Page", "10 scheduled posts / month", "Basic analytics", "Community support"]'::jsonb),
  ('basic', 'Basic', 499, 'monthly', 3, 100, 1,
   '["3 Facebook Pages", "100 scheduled posts / month", "Post scheduler + calendar", "Comments manager", "Email support"]'::jsonb),
  ('premium', 'Premium', 999, 'monthly', 10, 500, 3,
   '["10 Facebook Pages", "500 scheduled posts / month", "Advanced analytics + reports", "Comments manager", "Payout assistance", "Priority support"]'::jsonb),
  ('enterprise', 'Enterprise', 2499, 'monthly', 50, 5000, 10,
   '["50 Facebook Pages", "5,000 scheduled posts / month", "All Premium features", "Dedicated support", "Custom onboarding"]'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  price_inr = excluded.price_inr,
  billing_period = excluded.billing_period,
  max_pages = excluded.max_pages,
  max_scheduled_posts = excluded.max_scheduled_posts,
  max_team_members = excluded.max_team_members,
  features = excluded.features,
  updated_at = now();
