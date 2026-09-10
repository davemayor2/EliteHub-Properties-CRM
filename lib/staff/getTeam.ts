import { createClient, supabaseServer } from '@/lib/supabase/server';
import { StaffDetailView, TeamFiltersState, StaffStatus } from '@/types/staff';

/**
 * Fetches all staff members with applied search, role, and status filters,
 * enriched with complaint assignment statistics and active/awaiting login status.
 */
export async function getTeamMembers(
  filters?: Partial<TeamFiltersState>,
  client?: any
): Promise<StaffDetailView[]> {
  try {
    const supabase = client || (await createClient());

    let query = supabase.from('profiles').select('*');

    // Filter by role
    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    // Search by full_name or email
    if (filters?.search && filters.search.trim()) {
      const s = filters.search.trim();
      query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    let { data: profiles, error: profError } = await query.order('created_at', {
      ascending: false,
    });

    // Fallback to supabaseServer if createClient returned empty/error
    if ((profError || !profiles || profiles.length === 0) && supabase !== supabaseServer) {
      let fallbackQuery = supabaseServer.from('profiles').select('*');
      if (filters?.role && filters.role !== 'all') {
        fallbackQuery = fallbackQuery.eq('role', filters.role);
      }
      if (filters?.search && filters.search.trim()) {
        const s = filters.search.trim();
        fallbackQuery = fallbackQuery.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
      }
      const fallbackResult = await fallbackQuery.order('created_at', { ascending: false });
      if (fallbackResult.data && fallbackResult.data.length > 0) {
        profiles = fallbackResult.data;
        profError = null;
      }
    }

    if (profError || !profiles) {
      console.error('[getTeamMembers Error]:', profError);
      return [];
    }

    // Fetch complaint assignment counts
    const { data: complaints } = await supabase
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

    // Fetch message senders to identify members who have logged in and actively participated
    const { data: messages } = await supabase
      .from('complaint_messages')
      .select('sender_id');

    const activeSenders = new Set(
      (messages || [])
        .map((m: any) => m.sender_id)
        .filter(Boolean)
    );

    const enrichedProfiles: StaffDetailView[] = profiles.map((p: any) => {
      const isTouched =
        new Date(p.updated_at).getTime() - new Date(p.created_at).getTime() > 10000;
      const hasLoggedIn = activeSenders.has(p.id) || isTouched;
      const status: StaffStatus = !p.is_active
        ? 'inactive'
        : hasLoggedIn
        ? 'active'
        : 'awaiting_login';

      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: p.role,
        is_active: p.is_active ?? true,
        created_at: p.created_at,
        updated_at: p.updated_at,
        has_logged_in: hasLoggedIn,
        status,
        assigned_complaints_count: totalAssignedMap.get(p.id) || 0,
        open_complaints_count: openAssignedMap.get(p.id) || 0,
      };
    });

    // Apply status filter post-enrichment
    if (filters?.status && filters.status !== 'all') {
      return enrichedProfiles.filter((p) => p.status === filters.status);
    }

    return enrichedProfiles;
  } catch (err) {
    console.error('[getTeamMembers Exception]:', err);
    return [];
  }
}

/**
 * Fetches single staff member details by id with assignment statistics.
 */
export async function getStaffMemberById(
  id: string,
  client?: any
): Promise<StaffDetailView | null> {
  if (!id) return null;

  try {
    const supabase = client || (await createClient());

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if ((error || !profile) && supabase !== supabaseServer) {
      const fallback = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (fallback.data) {
        profile = fallback.data;
        error = null;
      }
    }

    if (error || !profile) {
      return null;
    }

    const { data: complaints } = await supabase
      .from('complaints')
      .select('status')
      .eq('assigned_to', id);

    let assignedTotal = 0;
    let openTotal = 0;

    if (complaints) {
      assignedTotal = complaints.length;
      openTotal = complaints.filter(
        (c: any) => c.status === 'new' || c.status === 'open' || c.status === 'pending'
      ).length;
    }

    const isTouched =
      new Date(profile.updated_at).getTime() - new Date(profile.created_at).getTime() > 10000;
    const hasLoggedIn = isTouched || assignedTotal > 0;
    const status: StaffStatus = !profile.is_active
      ? 'inactive'
      : hasLoggedIn
      ? 'active'
      : 'awaiting_login';

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      is_active: profile.is_active ?? true,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      has_logged_in: hasLoggedIn,
      status,
      assigned_complaints_count: assignedTotal,
      open_complaints_count: openTotal,
    };
  } catch (err) {
    console.error('[getStaffMemberById Exception]:', err);
    return null;
  }
}

