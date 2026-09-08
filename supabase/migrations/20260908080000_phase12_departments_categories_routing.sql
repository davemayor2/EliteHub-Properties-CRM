-- ==============================================================================
-- Migration: Phase 12 Complaint Categories, Departments, and Intelligent Routing
-- Version: 20260908080000
-- ==============================================================================

-- 1. Create departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    auto_assign_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for departments
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);

-- 2. Create complaint_categories Table
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

-- Indexes for complaint_categories
CREATE INDEX IF NOT EXISTS idx_complaint_categories_department_id ON public.complaint_categories(department_id);
CREATE INDEX IF NOT EXISTS idx_complaint_categories_is_active ON public.complaint_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_complaint_categories_order ON public.complaint_categories(display_order ASC, name ASC);

-- 3. Create staff_departments Junction Table
CREATE TABLE IF NOT EXISTS public.staff_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_staff_department UNIQUE (staff_id, department_id)
);

-- Indexes for staff_departments
CREATE INDEX IF NOT EXISTS idx_staff_departments_staff_id ON public.staff_departments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_departments_department_id ON public.staff_departments(department_id);

-- 4. Add category_id and department_id columns to complaints table
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

-- Indexes for complaints routing
CREATE INDEX IF NOT EXISTS idx_complaints_category_id ON public.complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department_id ON public.complaints(department_id);

-- 5. Seed Default Departments if none exist
INSERT INTO public.departments (name, description, is_active, auto_assign_enabled)
VALUES 
    ('Customer Care', 'General customer support, inquiries, and initial complaint triage.', true, false),
    ('Finance', 'Billing, transaction verification, refund requests, and payment discrepancies.', true, true),
    ('Operations', 'Property maintenance, facility inspections, and field service issues.', true, false),
    ('Technical Support', 'Portal issues, authentication failures, and website technical difficulties.', true, true),
    ('Management', 'Escalated legal matters, executive review, and administrative decisions.', true, false)
ON CONFLICT (name) DO NOTHING;

-- 6. Seed Default Complaint Categories linked to Departments
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
        ('Account Issues', 'Profile updates, contact details changes, or verification issues.', v_care_id, 6, true),
        ('Other', 'Unusual concerns or inquiries not covered by other categories.', v_care_id, 7, true)
    ON CONFLICT (department_id, name) DO NOTHING;
END $$;

-- 7. Trigger to maintain updated_at on departments and complaint_categories
CREATE OR REPLACE FUNCTION public.set_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.set_departments_updated_at();

DROP TRIGGER IF EXISTS trg_complaint_categories_updated_at ON public.complaint_categories;
CREATE TRIGGER trg_complaint_categories_updated_at
BEFORE UPDATE ON public.complaint_categories
FOR EACH ROW
EXECUTE FUNCTION public.set_departments_updated_at();

-- 8. Extend Complaint Activity Logging Trigger to include category and department changes
CREATE OR REPLACE FUNCTION public.log_complaints_activity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_type TEXT;
    v_old_cat_name TEXT;
    v_new_cat_name TEXT;
    v_old_dept_name TEXT;
    v_new_dept_name TEXT;
BEGIN
    v_actor_id := auth.uid();
    v_actor_type := CASE WHEN v_actor_id IS NOT NULL THEN 'staff' ELSE 'system' END;

    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.complaint_activity (
            complaint_id, actor_type, actor_id, activity_type, metadata
        ) VALUES (
            NEW.id, v_actor_type, v_actor_id, 'status_changed',
            jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status)
        );
    END IF;

    -- Priority change
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO public.complaint_activity (
            complaint_id, actor_type, actor_id, activity_type, metadata
        ) VALUES (
            NEW.id, v_actor_type, v_actor_id, 'priority_changed',
            jsonb_build_object('previous_priority', OLD.priority, 'new_priority', NEW.priority)
        );
    END IF;

    -- Assignment change
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.complaint_activity (
            complaint_id, actor_type, actor_id, activity_type, metadata
        ) VALUES (
            NEW.id, v_actor_type, v_actor_id,
            CASE WHEN NEW.assigned_to IS NULL THEN 'unassigned' ELSE 'assigned' END,
            jsonb_build_object('previous_assignee', OLD.assigned_to, 'new_assignee', NEW.assigned_to)
        );
    END IF;

    -- Category change
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        SELECT name INTO v_old_cat_name FROM public.complaint_categories WHERE id = OLD.category_id;
        SELECT name INTO v_new_cat_name FROM public.complaint_categories WHERE id = NEW.category_id;

        INSERT INTO public.complaint_activity (
            complaint_id, actor_type, actor_id, activity_type, metadata
        ) VALUES (
            NEW.id, v_actor_type, v_actor_id, 'category_changed',
            jsonb_build_object(
                'previous_category_id', OLD.category_id,
                'previous_category_name', COALESCE(v_old_cat_name, 'Uncategorized'),
                'new_category_id', NEW.category_id,
                'new_category_name', COALESCE(v_new_cat_name, 'Uncategorized')
            )
        );
    END IF;

    -- Department change
    IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
        SELECT name INTO v_old_dept_name FROM public.departments WHERE id = OLD.department_id;
        SELECT name INTO v_new_dept_name FROM public.departments WHERE id = NEW.department_id;

        INSERT INTO public.complaint_activity (
            complaint_id, actor_type, actor_id, activity_type, metadata
        ) VALUES (
            NEW.id, v_actor_type, v_actor_id, 'department_changed',
            jsonb_build_object(
                'previous_department_id', OLD.department_id,
                'previous_department_name', COALESCE(v_old_dept_name, 'Unassigned'),
                'new_department_id', NEW.department_id,
                'new_department_name', COALESCE(v_new_dept_name, 'Unassigned')
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Row Level Security (RLS) Policies
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

-- Departments Policies
DROP POLICY IF EXISTS "Authenticated staff can view departments" ON public.departments;
CREATE POLICY "Authenticated staff can view departments"
ON public.departments FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true
    )
);

DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true
    )
);

-- Complaint Categories Policies
DROP POLICY IF EXISTS "Public and authenticated can view active categories" ON public.complaint_categories;
CREATE POLICY "Public and authenticated can view active categories"
ON public.complaint_categories FOR SELECT
USING (is_active = true OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.complaint_categories;
CREATE POLICY "Admins can insert categories"
ON public.complaint_categories FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true
    )
);

DROP POLICY IF EXISTS "Admins can update categories" ON public.complaint_categories;
CREATE POLICY "Admins can update categories"
ON public.complaint_categories FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true
    )
);

-- Staff Departments Policies
DROP POLICY IF EXISTS "Authenticated staff can view staff departments" ON public.staff_departments;
CREATE POLICY "Authenticated staff can view staff departments"
ON public.staff_departments FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert staff departments" ON public.staff_departments;
CREATE POLICY "Admins can insert staff departments"
ON public.staff_departments FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true
    )
);

DROP POLICY IF EXISTS "Admins can delete staff departments" ON public.staff_departments;
CREATE POLICY "Admins can delete staff departments"
ON public.staff_departments FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true
    )
);
