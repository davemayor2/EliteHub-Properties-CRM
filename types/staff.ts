export type StaffRole = 'admin' | 'staff';
export type StaffStatus = 'active' | 'inactive';

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffDetailView extends StaffMember {
  assigned_complaints_count: number;
  open_complaints_count: number;
}

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  role: StaffRole;
}

export interface UpdateStaffPayload {
  full_name?: string;
  role?: StaffRole;
  is_active?: boolean;
}

export interface TeamFiltersState {
  search: string;
  role: 'all' | StaffRole;
  status: 'all' | StaffStatus;
}
