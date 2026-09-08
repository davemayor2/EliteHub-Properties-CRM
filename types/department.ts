import { StaffProfileRecord } from './complaint';

export interface DepartmentRecord {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  auto_assign_enabled: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface StaffDepartmentRecord {
  id: string;
  staff_id: string;
  department_id: string;
  created_at: string;
  profile?: StaffProfileRecord;
}

export interface DepartmentPayload {
  name: string;
  description?: string | null;
  is_active?: boolean;
  auto_assign_enabled?: boolean;
}
