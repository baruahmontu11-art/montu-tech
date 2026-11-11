import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET /api/health — liveness + DB connectivity check (no auth required). */
export async function GET() {
  let db = 'down';
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('profiles').select('id').limit(1);
    if (!error) db = 'ok';
  } catch {
    db = 'down';
  }
  const status = db === 'ok' ? 'ok' : 'degraded';
  return NextResponse.json(
    { status, db, version: process.env.npm_package_version ?? '1.0.0', time: new Date().toISOString() },
    { status: db === 'ok' ? 200 : 503 },
  );
}
