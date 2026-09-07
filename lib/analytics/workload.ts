import { SupabaseClient } from '@supabase/supabase-js';
import { StaffWorkloadItem, MyWorkloadMetrics } from './types';

/**
 * Fetches all active staff profiles and calculates their assigned workload.
 * Inactive staff members are excluded.
 * Sorted by highest active workload (open + pending + new).
 */
export async function getStaffWorkload(supabase: SupabaseClient): Promise<StaffWorkloadItem[]> {
  // 1. Fetch all active staff profiles
  const { data: staffProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (profilesError || !staffProfiles) {
    console.error('[getStaffWorkload profilesError]:', profilesError);
    return [];
  }

  // 2. Fetch all complaints with assigned_to and status
  const { data: complaints, error: complaintsError } = await supabase
    .from('complaints')
    .select('id, assigned_to, status');

  if (complaintsError || !complaints) {
    console.error('[getStaffWorkload complaintsError]:', complaintsError);
    return [];
  }

  // 3. Aggregate per staff profile
  const workloadMap = new Map<string, StaffWorkloadItem>();

  for (const staff of staffProfiles) {
    workloadMap.set(staff.id, {
      staffId: staff.id,
      fullName: staff.full_name || staff.email,
      email: staff.email,
      role: staff.role,
      assignedTotal: 0,
      openCount: 0,
      pendingCount: 0,
      resolvedCount: 0,
      closedCount: 0,
      activeWorkload: 0,
    });
  }

  for (const complaint of complaints) {
    if (complaint.assigned_to && workloadMap.has(complaint.assigned_to)) {
      const item = workloadMap.get(complaint.assigned_to)!;
      item.assignedTotal++;

      switch (complaint.status) {
        case 'new':
        case 'open':
          item.openCount++;
          item.activeWorkload++;
          break;
        case 'pending':
          item.pendingCount++;
          item.activeWorkload++;
          break;
        case 'resolved':
          item.resolvedCount++;
          break;
        case 'closed':
          item.closedCount++;
          break;
      }
    }
  }

  // Sort by highest active workload descending
  return Array.from(workloadMap.values()).sort((a, b) => {
    if (b.activeWorkload !== a.activeWorkload) {
      return b.activeWorkload - a.activeWorkload;
    }
    return b.assignedTotal - a.assignedTotal;
  });
}

/**
 * Returns personal workload metrics for a specific staff member.
 */
export async function getMyWorkload(
  supabase: SupabaseClient,
  staffId: string
): Promise<MyWorkloadMetrics> {
  const { data: complaints, error } = await supabase
    .from('complaints')
    .select('id, status')
    .eq('assigned_to', staffId);

  if (error || !complaints) {
    console.error('[getMyWorkload Error]:', error);
    return {
      assignedTotal: 0,
      openCount: 0,
      pendingCount: 0,
      resolvedCount: 0,
      closedCount: 0,
      activeWorkload: 0,
    };
  }

  let openCount = 0;
  let pendingCount = 0;
  let resolvedCount = 0;
  let closedCount = 0;

  for (const c of complaints) {
    switch (c.status) {
      case 'new':
      case 'open':
        openCount++;
        break;
      case 'pending':
        pendingCount++;
        break;
      case 'resolved':
        resolvedCount++;
        break;
      case 'closed':
        closedCount++;
        break;
    }
  }

  return {
    assignedTotal: complaints.length,
    openCount,
    pendingCount,
    resolvedCount,
    closedCount,
    activeWorkload: openCount + pendingCount,
  };
}
