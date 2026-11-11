'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client (public anon key only — never the service-role key).
 * Used by client components for auth state / realtime reads subject to RLS.
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Placeholder values so `next build` / prerender never crashes when env
    // is not configured yet; auth calls will fail at runtime with a clear
    // Supabase error until real keys are set in .env.local.
    if (typeof window !== 'undefined') console.warn('Supabase env vars are not set — auth will not work until NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.');
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-anon-key');
  }
  return createBrowserClient(url, anonKey);
}

// Singleton for convenience in client code.
let browserClient: SupabaseClient | null = null;
export function getBrowserClient(): SupabaseClient {
  if (!browserClient) browserClient = createClient();
  return browserClient;
}

/** Shared browser client used by the auth pages and Header. */
export const supabase: SupabaseClient = getBrowserClient();
