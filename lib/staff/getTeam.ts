import { supabaseServer } from '@/lib/supabase/server';
import { StaffDetailView, TeamFiltersState } from '@/types/staff';

/**
 * Fetches all staff members with applied search, role, and status filters,
 * enriched with complaint assignment statistics.
 */
export async function getTeamMembers(
  filters?: Partial<TeamFiltersState>
): Promise<StaffDetailView[]> {
  try {
    let query = supabaseServer.from('profiles').select('*');

    // Filter by role
    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    // Filter by status
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('is_active', filters.status === 'active');
    }

    // Search by full_name or email
    if (filters?.search && filters.search.trim()) {
      const s = filters.search.trim();
      query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data: profiles, error: profError } = await query.order('created_at', {
      ascending: false,
    });

    if (profError || !profiles) {
      console.error('[getTeamMembers Error]:', profError);
      return [];
    }

    // Fetch complaint assignment counts
    const { data: complaints } = await supabaseServer
      .from('complaints')
      .select('assigned_to, status');

    const totalAssignedMap = new Map<string, number>();
    const openAssignedMap = new Map<string, number>();

    if (complaints) {
      for (const c of complaints) {
        if (c.assigned_to) {
          totalAssignedMap.set(c.assigned_to, (totalAssignedMap.get(c.assigned_to) || 0) + 1);
          if (c.status === 'new' || c.status === 'open' || c.status === 'pending') {
            openAssignedMap.set(c.assigned_to, (openAssignedMap.get(c.assigned_to) || 0) + 1);
          }
        }
      }
    }

    return profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      is_active: p.is_active ?? true,
      created_at: p.created_at,
      updated_at: p.updated_at,
      assigned_complaints_count: totalAssignedMap.get(p.id) || 0,
      open_complaints_count: openAssignedMap.get(p.id) || 0,
    }));
  } catch (err) {
    console.error('[getTeamMembers Exception]:', err);
    return [];
  }
}

/**
 * Fetches single staff member details by id with assignment statistics.
 */
export async function getStaffMemberById(id: string): Promise<StaffDetailView | null> {
  if (!id) return null;

  try {
    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return null;
    }

    const { data: complaints } = await supabaseServer
      .from('complaints')
      .select('status')
      .eq('assigned_to', id);

    let assignedTotal = 0;
    let openTotal = 0;

    if (complaints) {
      assignedTotal = complaints.length;
      openTotal = complaints.filter(
        (c) => c.status === 'new' || c.status === 'open' || c.status === 'pending'
      ).length;
    }

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      is_active: profile.is_active ?? true,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      assigned_complaints_count: assignedTotal,
      open_complaints_count: openTotal,
    };
  } catch (err) {
    console.error('[getStaffMemberById Exception]:', err);
    return null;
  }
}
