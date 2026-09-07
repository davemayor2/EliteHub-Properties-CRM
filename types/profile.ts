export type UserRole = 'admin' | 'staff';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthSessionState {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  role?: UserRole;
  redirectTo?: string;
}
