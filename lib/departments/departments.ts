import { SupabaseClient } from '@supabase/supabase-js';
import { DepartmentRecord, DepartmentPayload, StaffDepartmentRecord } from '@/types/department';

/**
 * Fetch all departments with optional member counts.
 */
export async function getDepartments(
  supabase: SupabaseClient,
  includeInactive = false
): Promise<DepartmentRecord[]> {
  let query = supabase
    .from('departments')
    .select(`
      id,
      name,
      description,
      is_active,
      auto_assign_enabled,
      created_at,
      updated_at,
      staff_departments(count)
    `)
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('[getDepartments Error]:', error);
    return [];
  }

  return data.map((dept: any) => ({
    id: dept.id,
    name: dept.name,
    description: dept.description,
    is_active: dept.is_active,
    auto_assign_enabled: dept.auto_assign_enabled,
    created_at: dept.created_at,
    updated_at: dept.updated_at,
    member_count: dept.staff_departments?.[0]?.count || 0,
  }));
}

/**
 * Fetch a single department by ID.
 */
export async function getDepartmentById(
  supabase: SupabaseClient,
  id: string
): Promise<DepartmentRecord | null> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as DepartmentRecord;
}

/**
 * Fetch all staff members belonging to a department.
 */
export async function getDepartmentMembers(
  supabase: SupabaseClient,
  departmentId: string
): Promise<StaffDepartmentRecord[]> {
  const { data, error } = await supabase
    .from('staff_departments')
    .select(`
      id,
      staff_id,
      department_id,
      created_at,
      profile:profiles!staff_departments_staff_id_fkey(
        id,
        full_name,
        email,
        role,
        is_active
      )
    `)
    .eq('department_id', departmentId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('[getDepartmentMembers Error]:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    staff_id: item.staff_id,
    department_id: item.department_id,
    created_at: item.created_at,
    profile: item.profile,
  }));
}

/**
 * Create a new department.
 */
export async function createDepartment(
  supabase: SupabaseClient,
  payload: DepartmentPayload
): Promise<{ success: boolean; data?: DepartmentRecord; message?: string }> {
  const { name, description, is_active = true, auto_assign_enabled = false } = payload;

  if (!name || !name.trim()) {
    return { success: false, message: 'Department name is required.' };
  }

  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      is_active,
      auto_assign_enabled,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'A department with this name already exists.' };
    }
    return { success: false, message: error.message };
  }

  return { success: true, data: data as DepartmentRecord };
}

/**
 * Update an existing department.
 */
export async function updateDepartment(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<DepartmentPayload>
): Promise<{ success: boolean; data?: DepartmentRecord; message?: string }> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) {
    if (!payload.name.trim()) {
      return { success: false, message: 'Department name cannot be empty.' };
    }
    updates.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    updates.description = payload.description ? payload.description.trim() : null;
  }

  if (payload.is_active !== undefined) {
    updates.is_active = payload.is_active;
  }

  if (payload.auto_assign_enabled !== undefined) {
    updates.auto_assign_enabled = payload.auto_assign_enabled;
  }

  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Another department already uses this name.' };
    }
    return { success: false, message: error.message };
  }

  return { success: true, data: data as DepartmentRecord };
}

/**
 * Add a staff member to a department.
 */
export async function addStaffToDepartment(
  supabase: SupabaseClient,
  staffId: string,
  departmentId: string
): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase
    .from('staff_departments')
    .insert({
      staff_id: staffId,
      department_id: departmentId,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Staff member is already in this department.' };
    }
    return { success: false, message: error.message };
  }

  return { success: true };
}

/**
 * Remove a staff member from a department.
 */
export async function removeStaffFromDepartment(
  supabase: SupabaseClient,
  staffId: string,
  departmentId: string
): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase
    .from('staff_departments')
    .delete()
    .eq('staff_id', staffId)
    .eq('department_id', departmentId);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}
