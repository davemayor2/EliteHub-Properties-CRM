-- ==============================================================================
-- EliteHub Customer Care CRM: Database Setup & User Cleanup Script
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
    WHERE LOWER(email) = 'davidolajohn@gmail.com' 
    LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
        UPDATE public.complaints
        SET assigned_to = v_admin_id
        WHERE assigned_to IS NOT NULL AND assigned_to != v_admin_id;
    END IF;
END $$;

-- STEP 2: Delete all invited/test users except davidolajohn@gmail.com
-- (Cascades to public.profiles and related tables)
DELETE FROM auth.users 
WHERE LOWER(email) != 'davidolajohn@gmail.com';

-- Verify davidolajohn is active admin
UPDATE public.profiles
SET role = 'admin', is_active = true
WHERE LOWER(email) = 'davidolajohn@gmail.com';

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

-- STEP 9: Enable Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

-- Policies for departments
DROP POLICY IF EXISTS "Authenticated staff can view departments" ON public.departments;
CREATE POLICY "Authenticated staff can view departments"
ON public.departments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policies for complaint_categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.complaint_categories;
CREATE POLICY "Anyone can view active categories"
ON public.complaint_categories FOR SELECT TO anon, authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert complaint categories" ON public.complaint_categories;
CREATE POLICY "Admins can insert complaint categories"
ON public.complaint_categories FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update complaint categories" ON public.complaint_categories;
CREATE POLICY "Admins can update complaint categories"
ON public.complaint_categories FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policies for staff_departments
DROP POLICY IF EXISTS "Authenticated staff can view staff departments" ON public.staff_departments;
CREATE POLICY "Authenticated staff can view staff departments"
ON public.staff_departments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert staff departments" ON public.staff_departments;
CREATE POLICY "Admins can insert staff departments"
ON public.staff_departments FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete staff departments" ON public.staff_departments;
CREATE POLICY "Admins can delete staff departments"
ON public.staff_departments FOR DELETE TO authenticated
USING (public.is_admin());

-- STEP 10: Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
