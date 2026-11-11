/**
 * Scheduled-posts background worker.
 *
 * Polls `scheduled_posts` for rows with status='scheduled' and
 * scheduled_for <= now, publishes each via the Meta Graph API, and:
 *  - on success: marks 'published' (publishScheduledPost records published_posts)
 *  - on transient failure: increments attempts, retries with backoff (next run),
 *    and marks 'failed' after 3 attempts with the real error message.
 *  - on token expiry: the Page is flagged token_expired and the post fails.
 *
 * Run:  npx tsx workers/scheduled-posts/index.ts
 * Deploy on Railway as a separate worker service with the same env vars.
 * Graceful shutdown on SIGTERM / SIGINT.
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * TOKEN_ENCRYPTION_KEY, META_GRAPH_API_VERSION (optional, default v21.0).
 */
import { createClient } from '@supabase/supabase-js';
import { publishScheduledPost } from '../../src/lib/posts/publish';

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 60_000);
const MAX_ATTEMPTS = 3;

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

let shuttingDown = false;

async function runOnce(): Promise<void> {
  const admin = getAdmin();
  const { data: due, error } = await admin
    .from('scheduled_posts')
    .select('id, user_id, attempts')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', MAX_ATTEMPTS)
    .order('scheduled_for', { ascending: true })
    .limit(50);
  if (error) {
    console.error('[worker] failed to fetch due posts', error.message);
    return;
  }
  if (!due?.length) return;
  console.log(`[worker] ${due.length} due post(s)`);

  for (const post of due) {
    if (shuttingDown) break;
    // Claim the row so a concurrent worker run does not double-publish.
    const { data: claimed } = await admin
      .from('scheduled_posts')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', post.id)
      .eq('status', 'scheduled')
      .select('id')
      .single();
    if (!claimed) continue; // claimed by another worker

    const result = await publishScheduledPost(post.id, post.user_id);
    if (result.success) {
      console.log(`[worker] published ${post.id} -> ${result.metaPostId}`);
    } else {
      const attempts = (post.attempts ?? 0) + 1;
      const failed = attempts >= MAX_ATTEMPTS || result.tokenExpired || result.permissionError;
      const update: Record<string, unknown> = {
        status: failed ? 'failed' : 'scheduled',
        attempts,
        error_message: result.error ?? 'Publishing failed',
        updated_at: new Date().toISOString(),
      };
      if (!failed) {
        // Backoff: push the next attempt 5 min out (attempts * 5 min).
        update.scheduled_for = new Date(Date.now() + attempts * 5 * 60_000).toISOString();
      }
      await admin.from('scheduled_posts').update(update).eq('id', post.id);
      console.error(`[worker] post ${post.id} attempt ${attempts} failed: ${result.error}`);
    }
  }
}

async function main() {
  console.log('[worker] scheduled-posts worker starting, poll interval', POLL_INTERVAL_MS, 'ms');
  // eslint-disable-next-line no-constant-condition
  while (!shuttingDown) {
    try {
      await runOnce();
    } catch (err) {
      console.error('[worker] tick error', err);
    }
    if (shuttingDown) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.log('[worker] shutting down');
  process.exit(0);
}

process.on('SIGTERM', () => { shuttingDown = true; });
process.on('SIGINT', () => { shuttingDown = true; });

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
