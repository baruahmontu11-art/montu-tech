import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role (admin) Supabase client — SERVER ONLY.
 * Bypasses RLS, so it must only be used after explicit server-side
 * authorization checks (auth + ownership / is_admin). Never import
 * this file from client components and never expose the key.
 */
let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY — server-only admin client unavailable');
  }
  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

/** Throws unless the given user id is an admin (profiles.is_admin), checked server-side. */
export async function requireAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('is_admin, is_suspended')
    .eq('id', userId)
    .single();
  if (error || !data) return false;
  if (data.is_suspended) return false;
  return data.is_admin === true;
}
