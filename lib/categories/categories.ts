import { SupabaseClient } from '@supabase/supabase-js';
import { ComplaintCategoryRecord, CategoryPayload } from '@/types/category';

/**
 * Fetch all categories with associated department details.
 */
export async function getCategories(
  supabase: SupabaseClient,
  options: { includeInactive?: boolean; departmentId?: string } = {}
): Promise<ComplaintCategoryRecord[]> {
  const { includeInactive = false, departmentId } = options;

  let query = supabase
    .from('complaint_categories')
    .select(`
      id,
      name,
      description,
      department_id,
      is_active,
      display_order,
      created_at,
      updated_at,
      department:departments!complaint_categories_department_id_fkey(
        id,
        name,
        is_active,
        auto_assign_enabled
      )
    `)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('[getCategories Error]:', error);
    return [];
  }

  return data.map((cat: any) => ({
    ...cat,
    department: Array.isArray(cat.department) ? cat.department[0] : cat.department,
  }));
}

/**
 * Fetch active categories for public customer submission form.
 * Lightweight, ordered by display_order then name.
 */
export async function getActivePublicCategories(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; description: string | null }[]> {
  const { data, error } = await supabase
    .from('complaint_categories')
    .select('id, name, description')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error || !data) {
    console.error('[getActivePublicCategories Error]:', error);
    return [];
  }

  return data;
}

/**
 * Fetch category by ID.
 */
export async function getCategoryById(
  supabase: SupabaseClient,
  id: string
): Promise<ComplaintCategoryRecord | null> {
  const { data, error } = await supabase
    .from('complaint_categories')
    .select(`
      *,
      department:departments!complaint_categories_department_id_fkey(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    department: Array.isArray(data.department) ? data.department[0] : data.department,
  };
}

/**
 * Create a new category.
 */
export async function createCategory(
  supabase: SupabaseClient,
  payload: CategoryPayload
): Promise<{ success: boolean; data?: ComplaintCategoryRecord; message?: string }> {
  const { name, description, department_id, is_active = true, display_order = 0 } = payload;

  if (!name || !name.trim()) {
    return { success: false, message: 'Category name is required.' };
  }

  // If department_id is provided, verify it is an active department
  if (department_id) {
    const { data: dept, error: deptErr } = await supabase
      .from('departments')
      .select('id, is_active')
      .eq('id', department_id)
      .single();

    if (deptErr || !dept || !dept.is_active) {
      return { success: false, message: 'Selected department is not active or does not exist.' };
    }
  }

  const { data, error } = await supabase
    .from('complaint_categories')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      department_id: department_id || null,
      is_active,
      display_order,
    })
    .select(`
      *,
      department:departments!complaint_categories_department_id_fkey(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'A category with this name already exists in this department.' };
    }
    return { success: false, message: error.message };
  }

  return {
    success: true,
    data: {
      ...data,
      department: Array.isArray(data.department) ? data.department[0] : data.department,
    },
  };
}

/**
 * Update an existing category.
 */
export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<CategoryPayload>
): Promise<{ success: boolean; data?: ComplaintCategoryRecord; message?: string }> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) {
    if (!payload.name.trim()) {
      return { success: false, message: 'Category name cannot be empty.' };
    }
    updates.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    updates.description = payload.description ? payload.description.trim() : null;
  }

  if (payload.department_id !== undefined) {
    if (payload.department_id) {
      const { data: dept, error: deptErr } = await supabase
        .from('departments')
        .select('id, is_active')
        .eq('id', payload.department_id)
        .single();

      if (deptErr || !dept || !dept.is_active) {
        return { success: false, message: 'Selected department is not active.' };
      }
      updates.department_id = payload.department_id;
    } else {
      updates.department_id = null;
    }
  }

  if (payload.is_active !== undefined) {
    updates.is_active = payload.is_active;
  }

  if (payload.display_order !== undefined) {
    updates.display_order = Number(payload.display_order) || 0;
  }

  const { data, error } = await supabase
    .from('complaint_categories')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      department:departments!complaint_categories_department_id_fkey(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Another category in this department already uses this name.' };
    }
    return { success: false, message: error.message };
  }

  return {
    success: true,
    data: {
      ...data,
      department: Array.isArray(data.department) ? data.department[0] : data.department,
    },
  };
}
