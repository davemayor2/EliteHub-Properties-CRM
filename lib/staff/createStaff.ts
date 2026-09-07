import { createClient } from '@/lib/supabase/server';
import { CreateStaffPayload, StaffMember } from '@/types/staff';
import { resend, getEmailFrom, getAppUrl } from '@/lib/resend';
import { renderStaffInvitationEmail } from '@/emails/StaffInvitationEmail';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and creates a new staff member account.
 * Accessible only by administrators.
 */
export async function createStaffMember(
  payload: CreateStaffPayload
): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
  const fullName = payload.full_name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const role = payload.role || 'staff';

  // 1. Validation
  if (!fullName || fullName.length < 2) {
    return { success: false, error: 'Full name must be at least 2 characters long.' };
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (role !== 'admin' && role !== 'staff') {
    return { success: false, error: 'Role must be either admin or staff.' };
  }

  try {
    const supabase = await createClient();

    // 2. Call secure admin RPC to create user in auth.users and public.profiles
    const { data, error } = await supabase.rpc('admin_create_staff_user', {
      p_full_name: fullName,
      p_email: email,
      p_role: role,
    });

    if (error || !data) {
      console.error('[createStaffMember RPC Error]:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create staff account. Please try again.',
      };
    }

    // 3. Send branded invitation email via Resend (non-blocking)
    if (resend) {
      const appUrl = getAppUrl();
      const setupUrl = `${appUrl}/staff/login?setup=true&email=${encodeURIComponent(email)}`;
      const emailContent = renderStaffInvitationEmail({
        fullName,
        email,
        role,
        setupUrl,
      });

      resend.emails
        .send({
          from: getEmailFrom(),
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        })
        .then((res) => {
          if (res.error) {
            console.warn('[Staff Invitation Email Warning]:', res.error.message);
          }
        })
        .catch((err) => {
          console.error('[Staff Invitation Email Exception]:', err);
        });
    }

    return {
      success: true,
      staff: {
        id: data.user_id,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('[createStaffMember Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown server error',
    };
  }
}
