/**
 * Facebook permissions requested by Montu Tech.
 * Only the minimum permissions needed for the features in the brief.
 * NOTE: pages_manage_posts / pages_read_engagement require Meta App Review
 * before they work for users other than app admins/testers.
 */
export const REQUIRED_PERMISSIONS = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
] as const;

export type RequiredPermission = (typeof REQUIRED_PERMISSIONS)[number];

/** Comma-separated scope string for the OAuth dialog. */
export const SCOPES = REQUIRED_PERMISSIONS.join(',');

/** Human-readable explanation shown in the UI when a permission is missing. */
export const PERMISSION_DESCRIPTIONS: Record<RequiredPermission, string> = {
  pages_show_list: 'List the Facebook Pages you manage.',
  pages_read_engagement: 'Read Page engagement and insights.',
  pages_manage_posts: 'Create, publish and schedule posts on your Pages.',
};

export function missingPermissions(granted: string[] | null | undefined): RequiredPermission[] {
  const set = new Set(granted ?? []);
  return REQUIRED_PERMISSIONS.filter((p) => !set.has(p));
}
