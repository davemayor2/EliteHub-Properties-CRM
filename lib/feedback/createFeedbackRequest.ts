import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { CustomerFeedbackRecord } from '@/types/feedback';
import { sendFeedbackRequestEmail } from '@/services/email';

export interface CreateFeedbackRequestResult {
  success: boolean;
  feedback?: CustomerFeedbackRecord;
  token?: string;
  alreadyRequested: boolean;
  emailSent: boolean;
  error?: string;
}

/**
 * Creates a single-use customer feedback invitation for a resolved or closed complaint.
 * Ensures strict single-request idempotency.
 */
export async function createFeedbackRequest(
  supabase: SupabaseClient,
  complaintId: string,
  complaintContext?: {
    referenceNumber: string;
    customerEmail?: string | null;
    customerName?: string;
  }
): Promise<CreateFeedbackRequestResult> {
  try {
    // 1. Check if feedback record already exists for this complaint
    const { data: existing, error: fetchErr } = await supabase
      .from('customer_feedback')
      .select('*')
      .eq('complaint_id', complaintId)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== 'PGRST205') {
      console.error('[createFeedbackRequest Fetch Error]:', fetchErr);
    }

    if (existing) {
      return {
        success: true,
        feedback: existing as CustomerFeedbackRecord,
        token: existing.feedback_token,
        alreadyRequested: true,
        emailSent: false,
      };
    }

    // 2. Generate a cryptographically secure, unguessable token
    const token = crypto.randomBytes(24).toString('hex');
    const now = new Date().toISOString();

    // 3. Insert new feedback record with null submitted_at
    const { data: inserted, error: insertErr } = await supabase
      .from('customer_feedback')
      .insert({
        complaint_id: complaintId,
        feedback_token: token,
        rating: null,
        comment: null,
        submitted_at: null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (insertErr) {
      // If customer_feedback table is not yet migrated, handle gracefully
      if (insertErr.code === 'PGRST205' || insertErr.message?.includes('does not exist')) {
        console.warn('[createFeedbackRequest]: customer_feedback table not migrated yet.');
        return {
          success: false,
          alreadyRequested: false,
          emailSent: false,
          error: 'Feedback table not migrated',
        };
      }

      console.error('[createFeedbackRequest Insert Error]:', insertErr);
      return {
        success: false,
        alreadyRequested: false,
        emailSent: false,
        error: insertErr.message,
      };
    }

    // 4. Update complaint audit fields
    await supabase
      .from('complaints')
      .update({
        feedback_requested_at: now,
        feedback_email_sent_at: complaintContext?.customerEmail ? now : null,
      })
      .eq('id', complaintId);

    // 5. Log activity timeline event
    await supabase.from('complaint_activity').insert({
      complaint_id: complaintId,
      actor_type: 'system',
      activity_type: 'feedback_requested',
      metadata: {
        reference_number: complaintContext?.referenceNumber,
        token_created: true,
      },
      created_at: now,
    });

    // 6. Send feedback invitation email via Resend if email is present
    let emailSent = false;
    if (complaintContext?.customerEmail) {
      try {
        const emailRes = await sendFeedbackRequestEmail({
          to: complaintContext.customerEmail,
          referenceNumber: complaintContext.referenceNumber,
          feedbackToken: token,
          customerName: complaintContext.customerName,
        });
        emailSent = Boolean(emailRes.success && !emailRes.skipped);
      } catch (mailErr) {
        console.error('[createFeedbackRequest Email Warning]: Failed to deliver feedback email:', mailErr);
      }
    }

    return {
      success: true,
      feedback: inserted as CustomerFeedbackRecord,
      token,
      alreadyRequested: false,
      emailSent,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error creating feedback request';
    console.error('[createFeedbackRequest Exception]:', message);
    return {
      success: false,
      alreadyRequested: false,
      emailSent: false,
      error: message,
    };
  }
}
