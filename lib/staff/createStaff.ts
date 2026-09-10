import { createClient } from '@/lib/supabase/server';
import { CreateStaffPayload, StaffMember } from '@/types/staff';
import { resend, getEmailFrom, getAppUrl } from '@/lib/resend';
import { renderStaffInvitationEmail } from '@/emails/StaffInvitationEmail';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTemporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Elite#${rand}26`;
}

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
  const rawPassword = payload.password?.trim();

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

  if (rawPassword && rawPassword.length < 8) {
    return { success: false, error: 'Temporary password must be at least 8 characters long.' };
  }

  const initialPassword = rawPassword || generateTemporaryPassword();

  try {
    const supabase = await createClient();

    // 2. Call secure admin RPC to create user in auth.users and public.profiles with password
    const { data, error } = await supabase.rpc('admin_create_staff_user', {
      p_full_name: fullName,
      p_email: email,
      p_role: role,
      p_password: initialPassword,
    });

    if (error || !data) {
      console.error('[createStaffMember RPC Error]:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create staff account. Please try again.',
      };
    }

    // 3. Send branded invitation email with login credentials via Resend (non-blocking)
    if (resend) {
      const appUrl = getAppUrl();
      const setupUrl = `${appUrl}/staff/login?email=${encodeURIComponent(email)}`;
      const emailContent = renderStaffInvitationEmail({
        fullName,
        email,
        role,
        setupUrl,
        password: initialPassword,
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
        has_logged_in: false,
        status: 'awaiting_login',
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
