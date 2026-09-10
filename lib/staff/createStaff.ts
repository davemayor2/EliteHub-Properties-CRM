import { createClient } from '@/lib/supabase/server';
import { CreateStaffPayload, StaffMember } from '@/types/staff';
import { resend, getEmailFrom, getAppUrl } from '@/lib/resend';
import { renderStaffInvitationEmail } from '@/emails/StaffInvitationEmail';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateTemporaryPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%&*';

  let pw = '';
  pw += uppers.charAt(Math.floor(Math.random() * uppers.length));
  pw += letters.charAt(Math.floor(Math.random() * letters.length));
  pw += letters.charAt(Math.floor(Math.random() * letters.length));
  pw += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pw += symbols.charAt(Math.floor(Math.random() * symbols.length));
  pw += uppers.charAt(Math.floor(Math.random() * uppers.length));
  pw += letters.charAt(Math.floor(Math.random() * letters.length));
  pw += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return `Elite#${pw}`;
}

/**
 * Validates, creates, and invites a new staff member account.
 * Accessible only by administrators.
 */
export async function createStaffMember(
  payload: CreateStaffPayload,
  client?: any
): Promise<{ success: boolean; staff?: StaffMember; temporary_password?: string; error?: string }> {
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

  // Always guarantee a random high-entropy temporary password if not explicitly supplied
  const initialPassword = rawPassword || generateTemporaryPassword();

  try {
    const supabase = client || (await createClient());

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

    const userId = data.user_id;

    // 3. Fallback direct upsert to public.profiles to guarantee persistence across page refreshes
    if (userId) {
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName,
          email: email,
          role: role,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      } catch (upsertErr) {
        console.warn('[createStaffMember direct upsert warning]:', upsertErr);
      }
    }

    // 4. Send branded invitation email with login credentials via Resend
    if (resend) {
      try {
        const appUrl = getAppUrl();
        const setupUrl = `${appUrl}/staff/login?email=${encodeURIComponent(email)}`;
        const emailContent = renderStaffInvitationEmail({
          fullName,
          email,
          role,
          setupUrl,
          password: initialPassword,
        });

        await resend.emails.send({
          from: getEmailFrom(),
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailErr) {
        console.error('[Staff Invitation Email Exception]:', emailErr);
      }
    }

    return {
      success: true,
      temporary_password: initialPassword,
      staff: {
        id: userId,
        full_name: data.full_name || fullName,
        email: data.email || email,
        role: data.role || role,
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
