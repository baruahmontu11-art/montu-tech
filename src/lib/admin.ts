import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, requireAdmin } from '@/lib/supabase/admin';
import { jsonError } from '@/lib/api';
import type { User } from '@supabase/supabase-js';

/**
 * Admin gate for API routes: authenticated user + profiles.is_admin checked
 * server-side via the service-role client. Never trusts a client claim.
 */
export async function requireAdminUser(req: Request): Promise<
  | { user: User; admin: ReturnType<typeof createAdminClient> }
  | { response: NextResponse }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { response: jsonError('Unauthorized', 401) };
  const isAdmin = await requireAdmin(data.user.id);
  if (!isAdmin) return { response: jsonError('Forbidden: admin access required', 403) };
  return { user: data.user, admin: createAdminClient() };
}
