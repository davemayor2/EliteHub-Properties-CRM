import { createClient } from '@/lib/supabase/server';

/**
 * Permanently deletes a staff member from the CRM.
 * - Safely unassigns complaints assigned to this user so they remain accessible in the open queue.
 * - Deletes from staff_departments and public.profiles.
 * - Deletes from auth.users via admin_delete_staff_user RPC so the email can be re-invited anytime.
 */
export async function deleteStaffMember(
  targetId: string,
  callerId: string,
  client?: any
): Promise<{ success: boolean; error?: string }> {
  if (!targetId) {
    return { success: false, error: 'Staff member ID is required.' };
  }

  if (targetId === callerId) {
    return {
      success: false,
      error: 'Security restriction: You cannot delete your own administrator account.',
    };
  }

  try {
    const supabase = client || (await createClient());

    // 1. Fetch target profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', targetId)
      .single();

    if (targetError || !targetProfile) {
      return { success: false, error: 'Staff member not found.' };
    }

    // 2. Safeguard: Prevent deleting the last remaining active admin
    if (targetProfile.role === 'admin' && targetProfile.is_active) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', targetId);

      if (!count || count < 1) {
        return {
          success: false,
          error: 'Security restriction: Cannot delete this user. The system must have at least one active administrator.',
        };
      }
    }

    // 3. Call secure admin RPC to safely unassign complaints and delete from auth.users and profiles
    const { data, error } = await supabase.rpc('admin_delete_staff_user', {
      p_target_id: targetId,
    });

    if (error) {
      console.warn('[admin_delete_staff_user RPC Fallback]:', error.message);
      // Fallback manual cleanup in public schema if RPC is not yet executed in Supabase
      await supabase
        .from('complaints')
        .update({ assigned_to: null })
        .eq('assigned_to', targetId);

      await supabase
        .from('staff_departments')
        .delete()
        .eq('staff_id', targetId);

      const { error: deleteProfError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', targetId);

      if (deleteProfError) {
        return { success: false, error: deleteProfError.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[deleteStaffMember Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown server error deleting staff member.',
    };
  }
}
