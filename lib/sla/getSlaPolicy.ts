import { SupabaseClient } from '@supabase/supabase-js';
import { ComplaintPriority } from '@/types/complaint';
import { SlaPolicyRecord } from '@/types/sla';

interface SlaMatchCriteria {
  priority?: ComplaintPriority | null;
  departmentId?: string | null;
}

/**
 * Finds the most specific active SLA policy for a complaint according to precedence:
 * 1. Department + Priority policy
 * 2. Priority-only policy
 * 3. Department-only policy
 * 4. Default / Global policy (priority = null, department = null)
 *
 * Never fails or throws an exception. Returns null if no policy exists or table not ready.
 */
export async function getSlaPolicy(
  supabase: SupabaseClient,
  criteria: SlaMatchCriteria
): Promise<SlaPolicyRecord | null> {
  const { priority = null, departmentId = null } = criteria;

  try {
    // 1. Fetch all active policies
    const { data: policies, error } = await supabase
      .from('sla_policies')
      .select('*')
      .eq('is_active', true);

    if (error || !policies || policies.length === 0) {
      if (error && error.code !== 'PGRST205') {
        console.warn('[getSlaPolicy Warning]:', error.message);
      }
      return null;
    }

    const activeList = policies as SlaPolicyRecord[];

    // Tier 1: Department + Priority match
    if (departmentId && priority) {
      const matchDeptAndPriority = activeList.find(
        (p) => p.department_id === departmentId && p.priority === priority
      );
      if (matchDeptAndPriority) return matchDeptAndPriority;
    }

    // Tier 2: Priority-only match
    if (priority) {
      const matchPriorityOnly = activeList.find(
        (p) => (!p.department_id || p.department_id === null) && p.priority === priority
      );
      if (matchPriorityOnly) return matchPriorityOnly;
    }

    // Tier 3: Department-only match
    if (departmentId) {
      const matchDeptOnly = activeList.find(
        (p) => p.department_id === departmentId && (!p.priority || p.priority === null)
      );
      if (matchDeptOnly) return matchDeptOnly;
    }

    // Tier 4: Global Default (department = null and priority = null)
    const matchDefault = activeList.find(
      (p) => (!p.department_id || p.department_id === null) && (!p.priority || p.priority === null)
    );
    if (matchDefault) return matchDefault;

    return null;
  } catch (err) {
    console.error('[getSlaPolicy Exception]:', err);
    return null;
  }
}
