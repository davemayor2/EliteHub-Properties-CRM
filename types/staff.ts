export type StaffRole = 'admin' | 'staff';
export type StaffStatus = 'active' | 'awaiting_login' | 'inactive';

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  has_logged_in?: boolean;
  last_login_at?: string | null;
  status?: StaffStatus;
}

export interface StaffDetailView extends StaffMember {
  assigned_complaints_count: number;
  open_complaints_count: number;
}

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  role: StaffRole;
  password?: string;
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

