import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { metaGraph, MetaApiError } from '@/lib/meta/graph';

export interface PublishOutcome {
  success: boolean;
  metaPostId?: string;
  error?: string;
  permissionError?: boolean;
  tokenExpired?: boolean;
}

/**
 * Publish one scheduled_posts row to Facebook via the Graph API.
 * Shared by the publish-now route, the retry route and the background worker.
 * Never fabricates a post id — on failure the row is left/updated with the real error.
 */
export async function publishScheduledPost(postId: string, userId: string): Promise<PublishOutcome> {
  const admin = createAdminClient();
  const { data: post, error } = await admin
    .from('scheduled_posts')
    .select('id, user_id, page_id, content, media_url, media_type, link_url, status')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();
  if (error || !post) return { success: false, error: 'Post not found' };

  const { data: page } = await admin
    .from('facebook_pages')
    .select('id, page_id, access_token_encrypted, status')
    .eq('id', post.page_id)
    .eq('user_id', userId)
    .single();
  if (!page || page.status !== 'connected') return { success: false, error: 'Page is not connected' };

  let pageToken: string;
  try {
    pageToken = decryptToken(page.access_token_encrypted);
  } catch {
    return { success: false, error: 'Stored Page token could not be decrypted. Please reconnect Facebook.' };
  }

  try {
    let metaPostId: string;
    if (post.media_type === 'photo' && post.media_url) {
      const res = await metaGraph.publishPhoto(page.page_id, pageToken, {
        url: post.media_url,
        caption: post.content,
        published: true,
      });
      metaPostId = res.post_id ?? res.id;
    } else {
      const res = await metaGraph.publishPost(page.page_id, pageToken, {
        message: post.content,
        link: post.link_url ?? undefined,
        published: true,
      });
      metaPostId = res.id;
    }

    await admin.from('scheduled_posts').update({
      status: 'published',
      published_post_id: metaPostId,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', postId);
    await admin.from('published_posts').insert({
      user_id: userId,
      page_id: post.page_id,
      scheduled_post_id: postId,
      meta_post_id: metaPostId,
      content: post.content,
      media_url: post.media_url,
      media_type: post.media_type,
      published_at: new Date().toISOString(),
    });
    return { success: true, metaPostId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publishing failed';
    const permissionError = err instanceof MetaApiError && err.isPermissionError;
    const tokenExpired = err instanceof MetaApiError && err.isTokenExpired;
    if (tokenExpired) {
      await admin.from('facebook_pages').update({ status: 'token_expired' }).eq('id', page.id);
    }
    return { success: false, error: message, permissionError, tokenExpired };
  }
}
