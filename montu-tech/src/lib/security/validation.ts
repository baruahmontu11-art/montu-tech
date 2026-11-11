import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const postSchema = z.object({
  page_id: uuidSchema,
  content: z.string().trim().min(1, 'Post content is required').max(5000),
  media_url: z.string().url().optional().nullable(),
  media_type: z.enum(['text', 'photo', 'video', 'link']).default('text'),
  link_url: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'scheduled']).default('draft'),
  scheduled_for: z.string().datetime().optional().nullable(),
}).refine(
  (d) => d.status !== 'scheduled' || !!d.scheduled_for,
  { message: 'scheduled_for is required for scheduled posts', path: ['scheduled_for'] },
);

export const publishSchema = z.object({
  post_id: uuidSchema,
});

export const retrySchema = z.object({
  post_id: uuidSchema,
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.enum(['general', 'payout', 'technical', 'billing', 'other']).default('general'),
  message: z.string().trim().min(10).max(5000),
  page_id: uuidSchema.optional().nullable(),
});

export const payoutRequestTypeSchema = z.enum([
  'owner_name',
  'dob',
  'business_type',
  'bank_onboarding',
  'source_transfer',
]);

export const payoutRequestSchema = z.object({
  type: payoutRequestTypeSchema,
  page_id: uuidSchema.optional().nullable(),
  current_value: z.string().trim().max(200).optional().nullable(),
  requested_value: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(10).max(2000),
  document_url: z.string().url().optional().nullable(),
});

export const payoutStatusSchema = z.enum([
  'pending',
  'under_review',
  'in_progress',
  'waiting_for_information',
  'completed',
  'rejected',
]);

export const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
});

export const checkoutSchema = z.object({
  plan_id: z.enum(['free', 'basic', 'premium', 'enterprise']),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  plan_id: z.enum(['basic', 'premium', 'enterprise']),
});

export const commentReplySchema = z.object({
  comment_id: z.string().min(1),
  page_id: uuidSchema,
  message: z.string().trim().min(1).max(2000),
});

export const adminUserPatchSchema = z.object({
  is_suspended: z.boolean().optional(),
  is_admin: z.boolean().optional(),
});

export const adminTicketPatchSchema = z.object({
  status: z.enum(['pending', 'under_review', 'in_progress', 'waiting_for_information', 'completed', 'rejected']),
  admin_response: z.string().trim().max(5000).optional().nullable(),
});

/** Parse JSON body safely; returns null on invalid JSON. */
export async function parseJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
