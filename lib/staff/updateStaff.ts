import { createClient } from '@/lib/supabase/server';
import { UpdateStaffPayload, StaffMember } from '@/types/staff';

/**
 * Updates a staff member's profile, role, or active status.
 * Enforces all administrative safeguards server-side.
 */
export async function updateStaffMember(
  targetId: string,
  payload: UpdateStaffPayload
): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
  if (!targetId) {
    return { success: false, error: 'Target staff ID is required.' };
  }

  try {
    const supabase = await createClient();

    // 1. Fetch current profile to merge unchanged fields
    const { data: currentProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    if (fetchErr || !currentProfile) {
      return { success: false, error: 'Staff member not found.' };
    }

    const nextFullName = payload.full_name?.trim() || currentProfile.full_name;
    const nextRole = payload.role || currentProfile.role;
    const nextIsActive =
      payload.is_active !== undefined ? payload.is_active : currentProfile.is_active;

    // 2. Execute RPC with strict admin safety checks in Postgres
    const { data, error } = await supabase.rpc('admin_update_staff', {
      p_target_id: targetId,
      p_full_name: nextFullName,
      p_role: nextRole,
      p_is_active: nextIsActive,
    });

    if (error || !data) {
      console.error('[updateStaffMember RPC Error]:', error);
      return {
        success: false,
        error: error?.message || 'Failed to update staff member.',
      };
    }

    return {
      success: true,
      staff: {
        id: targetId,
        full_name: nextFullName,
        email: currentProfile.email,
        role: nextRole,
        is_active: nextIsActive,
        created_at: currentProfile.created_at,
        updated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('[updateStaffMember Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown server error',
    };
  }
}
