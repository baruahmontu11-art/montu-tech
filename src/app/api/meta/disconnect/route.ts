import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { metaGraph } from '@/lib/meta/graph';
import { writeAuditLog } from '@/lib/security/audit';

/** POST /api/meta/disconnect — revoke via Graph + delete connection and its Pages. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'meta-disconnect', 5, 60_000);
  if (limited) return limited;

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from('meta_connections')
    .select('id, access_token_encrypted')
    .eq('user_id', auth.user.id)
    .single();
  if (!conn) return jsonError('No Facebook connection found', 404);

  try {
    const token = decryptToken(conn.access_token_encrypted);
    await metaGraph.revokePermissions(token); // best-effort; local delete proceeds regardless
  } catch { /* token undecryptable — still disconnect locally */ }

  await admin.from('facebook_pages').delete().eq('meta_connection_id', conn.id);
  await admin.from('meta_connections').delete().eq('id', conn.id);
  await writeAuditLog({ user_id: auth.user.id, action: 'meta.disconnect', resource_type: 'meta_connection', resource_id: conn.id });
  return jsonOk({ success: true, disconnected: true });
}
