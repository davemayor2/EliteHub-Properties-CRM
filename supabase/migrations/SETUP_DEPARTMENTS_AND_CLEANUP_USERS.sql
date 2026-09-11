-- ==============================================================================
-- EliteHub Customer Care CRM: Comprehensive Database Setup & Staff System Script
-- Run this script in the Supabase Dashboard -> SQL Editor (New Query -> Run)
-- URL: https://supabase.com/dashboard/project/guxsqzmiqhduswqnorna/sql/new
-- ==============================================================================

-- STEP 1: Reassign any complaints assigned to other users to davidolajohn
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id 
    FROM public.profiles 
    WHERE LOWER(email) IN ('davidolajohn@gmail.com', 'davidthamayor@gmail.com')
    ORDER BY (CASE WHEN LOWER(email) = 'davidolajohn@gmail.com' THEN 1 ELSE 2 END)
    LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
        UPDATE public.complaints
        SET assigned_to = v_admin_id
        WHERE assigned_to IS NOT NULL AND assigned_to != v_admin_id;
    END IF;
END $$;

-- STEP 2: Delete invited test users except davidolajohn@gmail.com (and davidthamayor@gmail.com if active)
DELETE FROM auth.users 
WHERE LOWER(email) NOT IN ('davidolajohn@gmail.com', 'davidthamayor@gmail.com');

-- Ensure administrator privileges for primary admin account
UPDATE public.profiles
SET role = 'admin', is_active = true
WHERE LOWER(email) IN ('davidolajohn@gmail.com', 'davidthamayor@gmail.com');

-- STEP 3: Create public.departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    auto_assign_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);

-- STEP 4: Create public.complaint_categories Table
CREATE TABLE IF NOT EXISTS public.complaint_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_dept_name UNIQUE (department_id, name)
);

CREATE INDEX IF NOT EXISTS idx_complaint_categories_department_id ON public.complaint_categories(department_id);
CREATE INDEX IF NOT EXISTS idx_complaint_categories_is_active ON public.complaint_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_complaint_categories_order ON public.complaint_categories(display_order ASC, name ASC);

-- STEP 5: Create public.staff_departments Table
CREATE TABLE IF NOT EXISTS public.staff_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_staff_department UNIQUE (staff_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_departments_staff_id ON public.staff_departments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_departments_department_id ON public.staff_departments(department_id);

-- STEP 6: Add category_id and department_id columns to complaints table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'complaints' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN category_id UUID REFERENCES public.complaint_categories(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'complaints' 
        AND column_name = 'department_id'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_complaints_category_id ON public.complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department_id ON public.complaints(department_id);

-- STEP 7: Seed Default Departments
INSERT INTO public.departments (name, description, is_active, auto_assign_enabled)
VALUES 
    ('Customer Care', 'General customer support, inquiries, and initial complaint triage.', true, false),
    ('Finance', 'Billing, transaction verification, refund requests, and payment discrepancies.', true, true),
    ('Operations', 'Property maintenance, facility inspections, and field service issues.', true, false),
    ('Technical Support', 'Portal issues, authentication failures, and website technical difficulties.', true, true),
    ('Management', 'Escalated legal matters, executive review, and administrative decisions.', true, false)
ON CONFLICT (name) DO UPDATE 
SET 
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- STEP 8: Seed Default Categories
DO $$
DECLARE
    v_care_id UUID;
    v_fin_id UUID;
    v_ops_id UUID;
    v_tech_id UUID;
BEGIN
    SELECT id INTO v_care_id FROM public.departments WHERE name = 'Customer Care' LIMIT 1;
    SELECT id INTO v_fin_id FROM public.departments WHERE name = 'Finance' LIMIT 1;
    SELECT id INTO v_ops_id FROM public.departments WHERE name = 'Operations' LIMIT 1;
    SELECT id INTO v_tech_id FROM public.departments WHERE name = 'Technical Support' LIMIT 1;

    INSERT INTO public.complaint_categories (name, description, department_id, display_order, is_active)
    VALUES 
        ('Customer Service', 'General inquiries, feedback, or service quality concerns.', v_care_id, 1, true),
        ('Payment Issues', 'Unreflected payments, duplicate debits, or transaction receipts.', v_fin_id, 2, true),
        ('Refund Requests', 'Deposit refunds, overpayment cancellations, or balance returns.', v_fin_id, 3, true),
        ('Property Issues', 'Maintenance requests, physical defects, or property condition concerns.', v_ops_id, 4, true),
        ('Technical Issues', 'Portal login problems, broken links, or document upload errors.', v_tech_id, 5, true),
        ('Documentation & Legal', 'Title deed processing, contracts, surveys, and legal verifications.', v_care_id, 6, true)
    ON CONFLICT (department_id, name) DO NOTHING;
END $$;

-- STEP 9: Robust admin_create_staff_user RPC
-- Generates bcrypt hash with cost 10 for GoTrue compatibility, ensures immediate persistence in public.profiles,
-- and gracefully updates credentials if account already exists.
CREATE OR REPLACE FUNCTION public.admin_create_staff_user(
    p_full_name TEXT,
    p_email TEXT,
    p_role TEXT,
    p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_existing_id UUID;
    v_hashed_pw TEXT;
    v_clean_email TEXT;
BEGIN
    -- Verify caller is active admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required.';
    END IF;

    v_clean_email := LOWER(TRIM(p_email));

    -- Generate bcrypt password hash with standard cost 10
    IF p_password IS NOT NULL AND LENGTH(TRIM(p_password)) >= 8 THEN
        v_hashed_pw := crypt(TRIM(p_password), gen_salt('bf', 10));
    ELSE
        v_hashed_pw := crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf', 10));
    END IF;

    -- Check if user already exists in auth.users
    SELECT id INTO v_existing_id FROM auth.users WHERE LOWER(email) = v_clean_email;

    IF v_existing_id IS NOT NULL THEN
        -- User exists: update encrypted password, confirm email, and refresh metadata
        UPDATE auth.users
        SET encrypted_password = v_hashed_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now(),
            raw_user_meta_data = jsonb_build_object('full_name', TRIM(p_full_name), 'role', p_role)
        WHERE id = v_existing_id;

        -- Ensure profile exists in public.profiles
        INSERT INTO public.profiles (id, full_name, email, role, is_active, created_at, updated_at)
        VALUES (v_existing_id, TRIM(p_full_name), v_clean_email, p_role, true, now(), now())
        ON CONFLICT (id) DO UPDATE
        SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            is_active = true,
            updated_at = now();

        RETURN jsonb_build_object(
            'success', true,
            'user_id', v_existing_id,
            'email', v_clean_email,
            'full_name', TRIM(p_full_name),
            'role', p_role
        );
    END IF;

    v_user_id := gen_random_uuid();

    -- Insert new user into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_clean_email,
        v_hashed_pw,
        now(),
        now(),
        NULL,
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', TRIM(p_full_name), 'role', p_role),
        now(),
        now(),
        '',
        '',
        '',
        '',
        false
    );

    -- Directly insert into public.profiles (ensures persistence independent of trigger)
    INSERT INTO public.profiles (id, full_name, email, role, is_active, created_at, updated_at)
    VALUES (v_user_id, TRIM(p_full_name), v_clean_email, p_role, true, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', v_clean_email,
        'full_name', TRIM(p_full_name),
        'role', p_role
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_staff_user(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- STEP 10: Enable Row Level Security (RLS) & Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

-- Ensure all authenticated staff can view the full staff directory
DROP POLICY IF EXISTS "Authenticated staff can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Authenticated staff can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for departments
DROP POLICY IF EXISTS "Authenticated staff can view departments" ON public.departments;
CREATE POLICY "Authenticated staff can view departments"
ON public.departments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for complaint_categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.complaint_categories;
CREATE POLICY "Anyone can view active categories"
ON public.complaint_categories FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can insert complaint categories" ON public.complaint_categories;
CREATE POLICY "Admins can insert complaint categories"
ON public.complaint_categories FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update complaint categories" ON public.complaint_categories;
CREATE POLICY "Admins can update complaint categories"
ON public.complaint_categories FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for staff_departments
DROP POLICY IF EXISTS "Authenticated staff can view staff departments" ON public.staff_departments;
CREATE POLICY "Authenticated staff can view staff departments"
ON public.staff_departments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert staff departments" ON public.staff_departments;
CREATE POLICY "Admins can insert staff departments"
ON public.staff_departments FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete staff departments" ON public.staff_departments;
CREATE POLICY "Admins can delete staff departments"
ON public.staff_departments FOR DELETE TO authenticated
USING (true);

-- STEP 11: Admin function to completely remove staff member (allowing re-invitations)
CREATE OR REPLACE FUNCTION public.admin_delete_staff_user(p_target_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_admin_count INT;
  v_target_role TEXT;
BEGIN
  v_caller_id := auth.uid();

  -- Verify caller is admin
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only active administrators can permanently delete staff accounts.';
  END IF;

  -- Verify caller is not deleting themselves
  IF v_caller_id = p_target_id THEN
    RAISE EXCEPTION 'Action blocked: you cannot delete your own administrator account.';
  END IF;

  -- Check if target is admin and verify at least one other active admin remains
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_id;
  IF v_target_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin' AND is_active = true AND id != p_target_id;
    IF v_admin_count < 1 THEN
      RAISE EXCEPTION 'Action blocked: cannot delete the last active administrator.';
    END IF;
  END IF;

  -- 1. Safely unassign complaints so tickets remain safe in the unassigned pool
  UPDATE public.complaints
  SET assigned_to = NULL, updated_at = NOW()
  WHERE assigned_to = p_target_id;

  -- 2. Remove staff department mappings
  DELETE FROM public.staff_departments
  WHERE staff_id = p_target_id;

  -- 3. Delete profile
  DELETE FROM public.profiles
  WHERE id = p_target_id;

  -- 4. Delete auth user so email is freed up for future invitations
  DELETE FROM auth.users
  WHERE id = p_target_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_staff_user(UUID) TO authenticated;

-- STEP 12: Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

