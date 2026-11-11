import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditEntry {
  user_id?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
}

/** Best-effort audit-log write; never throws (audit must not break the request). */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      user_id: entry.user_id ?? null,
      action: entry.action,
      resource_type: entry.resource_type ?? null,
      resource_id: entry.resource_id ?? null,
      details: entry.details ?? null,
      ip_address: entry.ip_address ?? null,
    });
  } catch (err) {
    console.error('[audit] failed to write audit log', err);
  }
}
