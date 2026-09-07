import { supabaseServer } from '@/lib/supabase/server';
import { CustomerComplaintView, CustomerMessageView, ComplaintStatus } from '@/types/complaint';

/**
 * Server-side helper to safely fetch customer complaint data using a validated tracking token.
 * Excludes internal priority, staff IDs, internal audit logs, and internal UUIDs.
 */
export async function getComplaintByTrackingToken(
  token: string
): Promise<CustomerComplaintView | null> {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return null;
  }

  try {
    const { data, error } = await supabaseServer.rpc('get_customer_complaint_by_token', {
      p_token: token.trim(),
    });

    if (error || !data) {
      return null;
    }

    return data as CustomerComplaintView;
  } catch (err) {
    console.error('[lib/tracking getComplaintByTrackingToken Exception]:', err);
    return null;
  }
}

/**
 * Server-side helper to submit a customer response via tracking token.
 * Triggers status transition from pending -> open automatically.
 */
export async function submitCustomerMessage(
  token: string,
  message: string
): Promise<{ success: boolean; message?: CustomerMessageView; status?: ComplaintStatus; error?: string }> {
  if (!token || !message || !message.trim()) {
    return { success: false, error: 'Token and message are required.' };
  }

  try {
    const { data, error } = await supabaseServer.rpc('submit_customer_message_by_token', {
      p_token: token.trim(),
      p_message: message.trim(),
    });

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to submit response.' };
    }

    return {
      success: true,
      message: data.message,
      status: data.status,
    };
  } catch (err) {
    console.error('[lib/tracking submitCustomerMessage Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown server error',
    };
  }
}
