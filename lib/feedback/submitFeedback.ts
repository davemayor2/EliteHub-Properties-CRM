import { SupabaseClient } from '@supabase/supabase-js';
import { CustomerFeedbackRecord, FeedbackRating } from '@/types/feedback';

export interface SubmitFeedbackParams {
  token: string;
  rating: number;
  comment?: string | null;
}

export interface SubmitFeedbackResult {
  success: boolean;
  feedback?: CustomerFeedbackRecord;
  referenceNumber?: string;
  alreadySubmitted?: boolean;
  error?: string;
}

/**
 * Validates and records customer satisfaction feedback for a given token.
 * Prevents multiple submissions and logs audit events.
 */
export async function submitFeedback(
  supabase: SupabaseClient,
  params: SubmitFeedbackParams
): Promise<SubmitFeedbackResult> {
  const { token, rating, comment } = params;

  // 1. Validate Token format
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, error: 'Invalid or missing feedback token' };
  }

  // 2. Validate Rating
  const parsedRating = Math.floor(Number(rating));
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return { success: false, error: 'Rating must be an integer between 1 and 5' };
  }

  // 3. Validate Comment length (max 2,000 characters)
  const trimmedComment = typeof comment === 'string' ? comment.trim() : null;
  if (trimmedComment && trimmedComment.length > 2000) {
    return { success: false, error: 'Comment cannot exceed 2,000 characters' };
  }

  try {
    // 4. Look up feedback record with complaint reference
    const { data: record, error: fetchErr } = await supabase
      .from('customer_feedback')
      .select(`
        *,
        complaint:complaints!customer_feedback_complaint_id_fkey(id, reference_number)
      `)
      .eq('feedback_token', token.trim())
      .single();

    if (fetchErr || !record) {
      return { success: false, error: 'This feedback link is invalid or does not exist' };
    }

    // 5. Prevent multiple submissions
    if (record.submitted_at) {
      return {
        success: false,
        alreadySubmitted: true,
        error: 'You have already submitted feedback for this complaint',
      };
    }

    const now = new Date().toISOString();

    // 6. Save customer response
    const { data: updated, error: updateErr } = await supabase
      .from('customer_feedback')
      .update({
        rating: parsedRating as FeedbackRating,
        comment: trimmedComment || null,
        submitted_at: now,
        updated_at: now,
      })
      .eq('id', record.id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      console.error('[submitFeedback Update Error]:', updateErr);
      return { success: false, error: 'Failed to record feedback. Please try again.' };
    }

    const refNumber = record.complaint?.reference_number || 'EH-Ref';

    // 7. Log feedback_submitted activity event
    await supabase.from('complaint_activity').insert({
      complaint_id: record.complaint_id,
      actor_type: 'customer',
      activity_type: 'feedback_submitted',
      metadata: {
        reference_number: refNumber,
        rating: parsedRating,
        has_comment: Boolean(trimmedComment),
      },
      created_at: now,
    });

    // 8. Low satisfaction alert (Rating 1 or 2)
    if (parsedRating <= 2) {
      await supabase.from('complaint_activity').insert({
        complaint_id: record.complaint_id,
        actor_type: 'system',
        activity_type: 'low_satisfaction_received',
        metadata: {
          reference_number: refNumber,
          rating: parsedRating,
          comment_preview: trimmedComment ? trimmedComment.slice(0, 100) : null,
        },
        created_at: now,
      });
    }

    return {
      success: true,
      feedback: updated as CustomerFeedbackRecord,
      referenceNumber: refNumber,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown feedback submission error';
    console.error('[submitFeedback Exception]:', msg);
    return { success: false, error: 'An unexpected error occurred while submitting feedback' };
  }
}
