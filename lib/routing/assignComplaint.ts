import { SupabaseClient } from '@supabase/supabase-js';
import { RoutingResult } from '@/types/routing';

/**
 * Resolves department and staff auto-assignment for a given category.
 * MVP Intelligent Routing Strategy:
 * 1. Resolves the category's associated department.
 * 2. If auto_assign_enabled is true on the department:
 *    - Queries all active staff assigned to that department.
 *    - Calculates active workload (new, open, pending) for each staff member.
 *    - Selects the active staff member with the lowest active workload.
 * 3. If auto_assign_enabled is false or no eligible staff exist:
 *    - Associates department only, leaves assigned_to null.
 * 4. Never throws - returns a safe fallback RoutingResult so complaint creation never fails.
 */
export async function resolveComplaintRouting(
  supabase: SupabaseClient,
  categoryId?: string | null
): Promise<RoutingResult> {
  const fallbackResult: RoutingResult = {
    departmentId: null,
    departmentName: null,
    assignedTo: null,
    assignedStaffName: null,
    routingStrategy: 'unassigned',
  };

  if (!categoryId) {
    return fallbackResult;
  }

  try {
    // 1. Fetch category and its associated department
    const { data: category, error: catErr } = await supabase
      .from('complaint_categories')
      .select(`
        id,
        name,
        is_active,
        department_id,
        department:departments!complaint_categories_department_id_fkey(
          id,
          name,
          is_active,
          auto_assign_enabled
        )
      `)
      .eq('id', categoryId)
      .single();

    if (catErr || !category || !category.is_active) {
      console.warn('[Routing] Category not found or inactive:', categoryId, catErr?.message);
      return fallbackResult;
    }

    const dept = Array.isArray(category.department)
      ? category.department[0]
      : (category.department as any);

    if (!dept || !dept.is_active) {
      return {
        departmentId: null,
        departmentName: null,
        assignedTo: null,
        assignedStaffName: null,
        routingStrategy: 'unassigned',
        reason: 'Department is inactive or not assigned to category',
      };
    }

    const departmentId = dept.id;
    const departmentName = dept.name;

    // 2. Check if auto assignment is enabled for this department
    if (!dept.auto_assign_enabled) {
      return {
        departmentId,
        departmentName,
        assignedTo: null,
        assignedStaffName: null,
        routingStrategy: 'manual',
        reason: 'Auto-assignment disabled for department',
      };
    }

    // 3. Find active staff assigned to this department
    const { data: staffMemberships, error: staffDeptErr } = await supabase
      .from('staff_departments')
      .select(`
        staff_id,
        profile:profiles!staff_departments_staff_id_fkey(
          id,
          full_name,
          email,
          role,
          is_active
        )
      `)
      .eq('department_id', departmentId);

    if (staffDeptErr || !staffMemberships || staffMemberships.length === 0) {
      return {
        departmentId,
        departmentName,
        assignedTo: null,
        assignedStaffName: null,
        routingStrategy: 'unassigned',
        reason: 'No staff members configured in department',
      };
    }

    // Filter to only active staff accounts
    const activeStaff = staffMemberships
      .map((sm: any) => sm.profile)
      .filter((p: any) => p && p.is_active === true);

    if (activeStaff.length === 0) {
      return {
        departmentId,
        departmentName,
        assignedTo: null,
        assignedStaffName: null,
        routingStrategy: 'unassigned',
        reason: 'No active staff accounts available in department',
      };
    }

    // 4. Calculate active workload (new, open, pending complaints) for each eligible staff member
    const activeStaffIds = activeStaff.map((s: any) => s.id);
    const { data: activeComplaints, error: complaintsErr } = await supabase
      .from('complaints')
      .select('id, assigned_to, status')
      .in('assigned_to', activeStaffIds)
      .in('status', ['new', 'open', 'pending']);

    const workloadCount = new Map<string, number>();
    for (const s of activeStaff) {
      workloadCount.set(s.id, 0);
    }

    if (!complaintsErr && activeComplaints) {
      for (const c of activeComplaints) {
        if (c.assigned_to && workloadCount.has(c.assigned_to)) {
          workloadCount.set(c.assigned_to, (workloadCount.get(c.assigned_to) || 0) + 1);
        }
      }
    }

    // Sort active staff by lowest workload
    const sortedStaff = [...activeStaff].sort((a: any, b: any) => {
      const loadA = workloadCount.get(a.id) || 0;
      const loadB = workloadCount.get(b.id) || 0;
      return loadA - loadB;
    });

    const chosenStaff = sortedStaff[0];

    return {
      departmentId,
      departmentName,
      assignedTo: chosenStaff.id,
      assignedStaffName: chosenStaff.full_name || chosenStaff.email,
      routingStrategy: 'auto',
      reason: `Assigned to least-busy staff with ${workloadCount.get(chosenStaff.id) || 0} active complaints`,
    };
  } catch (err) {
    console.error('[Routing Exception]:', err);
    return fallbackResult;
  }
}
