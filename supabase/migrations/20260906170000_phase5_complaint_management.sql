-- ==============================================================================
-- Migration: Phase 5 Complaint Management, Assignment, and Activity Tracking
-- Version: 20260906170000
-- ==============================================================================

-- 1. Add assigned_to column to public.complaints if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'complaints' 
        AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create index for fast lookups by assigned staff
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);

-- 3. RLS: Enable Authenticated Staff to UPDATE complaints
DROP POLICY IF EXISTS "Authenticated staff can update complaints" ON public.complaints;
CREATE POLICY "Authenticated staff can update complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. RLS: Enable Authenticated Staff to view all staff profiles for assignment
DROP POLICY IF EXISTS "Authenticated staff can view profiles" ON public.profiles;
CREATE POLICY "Authenticated staff can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 5. Create Complaint Activities Table (Foundation for Audit & Activity Timeline)
CREATE TABLE IF NOT EXISTS public.complaint_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'created', 'status_changed', 'priority_changed', 'assigned', 'unassigned'
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance index for complaint activity history
CREATE INDEX IF NOT EXISTS idx_complaint_activities_complaint_id ON public.complaint_activities(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_activities_created_at ON public.complaint_activities(created_at DESC);

-- Enable RLS on complaint_activities
ALTER TABLE public.complaint_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view complaint activities" ON public.complaint_activities;
CREATE POLICY "Authenticated staff can view complaint activities"
ON public.complaint_activities
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated staff can insert complaint activities" ON public.complaint_activities;
CREATE POLICY "Authenticated staff can insert complaint activities"
ON public.complaint_activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Trigger Function to automatically log activity when status, priority, or assignment changes
CREATE OR REPLACE FUNCTION public.log_complaint_activity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();

    -- Check if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.complaint_activities (
            complaint_id,
            actor_id,
            action_type,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            v_actor_id,
            'status_changed',
            OLD.status,
            NEW.status
        );
    END IF;

    -- Check if priority changed
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO public.complaint_activities (
            complaint_id,
            actor_id,
            action_type,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            v_actor_id,
            'priority_changed',
            OLD.priority,
            NEW.priority
        );
    END IF;

    -- Check if assignment changed
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.complaint_activities (
            complaint_id,
            actor_id,
            action_type,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            v_actor_id,
            CASE 
                WHEN NEW.assigned_to IS NULL THEN 'unassigned'
                ELSE 'assigned'
            END,
            OLD.assigned_to::TEXT,
            NEW.assigned_to::TEXT
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_complaint_activity ON public.complaints;
CREATE TRIGGER trigger_log_complaint_activity
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.log_complaint_activity_trigger();

-- 7. Storage Policy: Enable Authenticated Staff to SELECT/Download/SignedURL private attachments
DROP POLICY IF EXISTS "Authenticated staff can read complaint-attachments" ON storage.objects;
CREATE POLICY "Authenticated staff can read complaint-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'complaint-attachments' AND auth.uid() IS NOT NULL);

