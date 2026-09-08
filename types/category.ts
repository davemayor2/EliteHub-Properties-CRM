import { DepartmentRecord } from './department';

export interface ComplaintCategoryRecord {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  department?: DepartmentRecord | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryPayload {
  name: string;
  description?: string | null;
  department_id?: string | null;
  is_active?: boolean;
  display_order?: number;
}
