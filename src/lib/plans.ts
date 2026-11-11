export type PlanId = 'free' | 'basic' | 'premium' | 'enterprise';

export interface PlanLimits {
  id: PlanId;
  name: string;
  priceInr: number; // monthly, INR (0 = free)
  pages: number; // max connected Facebook Pages
  scheduledPostsPerMonth: number;
  publishedPostsPerMonth: number;
  teamMembers: number;
  analyticsDays: number; // history window
  supportPriority: 'community' | 'standard' | 'priority' | 'dedicated';
  features: string[];
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    priceInr: 0,
    pages: 1,
    scheduledPostsPerMonth: 10,
    publishedPostsPerMonth: 30,
    teamMembers: 1,
    analyticsDays: 7,
    supportPriority: 'community',
    features: ['1 Facebook Page', '10 scheduled posts/month', 'Basic analytics (7 days)', 'Community support'],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    priceInr: 499,
    pages: 3,
    scheduledPostsPerMonth: 50,
    publishedPostsPerMonth: 150,
    teamMembers: 1,
    analyticsDays: 30,
    supportPriority: 'standard',
    features: ['3 Facebook Pages', '50 scheduled posts/month', 'Analytics (30 days)', 'Comments manager', 'Standard support'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceInr: 999,
    pages: 10,
    scheduledPostsPerMonth: 200,
    publishedPostsPerMonth: 600,
    teamMembers: 3,
    analyticsDays: 90,
    supportPriority: 'priority',
    features: ['10 Facebook Pages', '200 scheduled posts/month', 'Analytics (90 days)', 'Payout assistance', 'Priority support'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceInr: 2499,
    pages: 50,
    scheduledPostsPerMonth: 1000,
    publishedPostsPerMonth: 3000,
    teamMembers: 10,
    analyticsDays: 365,
    supportPriority: 'dedicated',
    features: ['50 Facebook Pages', '1,000 scheduled posts/month', 'Analytics (365 days)', 'Dedicated support', 'Audit logs'],
  },
};

export function getPlan(id: string | null | undefined): PlanLimits {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.free;
}

/** Resolve a user's effective plan from their active subscription row (or Free). */
export function planFromSubscription(sub: { plan_id?: string | null; status?: string | null } | null): PlanLimits {
  if (!sub || sub.status !== 'active') return PLANS.free;
  return getPlan(sub.plan_id);
}
