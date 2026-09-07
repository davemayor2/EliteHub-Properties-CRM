-- ==============================================================================
-- Migration: Phase 9 Internal Notes and Activity Timeline
-- Version: 20260907120000
-- ==============================================================================

-- 1. Create complaint_notes Table
CREATE TABLE IF NOT EXISTS public.complaint_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for complaint_notes
CREATE INDEX IF NOT EXISTS idx_complaint_notes_complaint_id ON public.complaint_notes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_notes_author_id ON public.complaint_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_complaint_notes_created_at ON public.complaint_notes(created_at ASC);

-- Enable RLS on complaint_notes
ALTER TABLE public.complaint_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated staff can view notes
DROP POLICY IF EXISTS "authenticated_staff_can_select_notes" ON public.complaint_notes;
CREATE POLICY "authenticated_staff_can_select_notes"
ON public.complaint_notes
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- RLS: Authenticated staff can create notes
DROP POLICY IF EXISTS "authenticated_staff_can_insert_notes" ON public.complaint_notes;
CREATE POLICY "authenticated_staff_can_insert_notes"
ON public.complaint_notes
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Trigger to maintain updated_at on complaint_notes
CREATE OR REPLACE FUNCTION public.set_complaint_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_notes_updated_at ON public.complaint_notes;
CREATE TRIGGER trg_complaint_notes_updated_at
BEFORE UPDATE ON public.complaint_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_complaint_notes_updated_at();

-- 2. Create complaint_activity Table
CREATE TABLE IF NOT EXISTS public.complaint_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('staff', 'customer', 'system')),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for complaint_activity
CREATE INDEX IF NOT EXISTS idx_complaint_activity_complaint_id ON public.complaint_activity(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_activity_created_at ON public.complaint_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_activity_activity_type ON public.complaint_activity(activity_type);

-- Enable RLS on complaint_activity
ALTER TABLE public.complaint_activity ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated staff can view activity
DROP POLICY IF EXISTS "authenticated_staff_can_select_activity" ON public.complaint_activity;
CREATE POLICY "authenticated_staff_can_select_activity"
ON public.complaint_activity
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- RLS: Authenticated staff can insert activity
DROP POLICY IF EXISTS "authenticated_staff_can_insert_activity" ON public.complaint_activity;
CREATE POLICY "authenticated_staff_can_insert_activity"
ON public.complaint_activity
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- 3. Trigger: Automatically log complaint creation
CREATE OR REPLACE FUNCTION public.log_complaint_created_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.complaint_activity (
        complaint_id, actor_type, actor_id, activity_type, metadata
    ) VALUES (
        NEW.id, 'customer', NULL, 'complaint_created',
        jsonb_build_object('reference_number', NEW.reference_number)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activity_on_complaint_created ON public.complaints;
CREATE TRIGGER trg_activity_on_complaint_created
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.log_complaint_created_activity();

-- 4. Trigger: Automatically log internal notes
CREATE OR REPLACE FUNCTION public.log_internal_note_added_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.complaint_activity (
        complaint_id, actor_type, actor_id, activity_type, metadata
    ) VALUES (
        NEW.complaint_id, 'staff', NEW.author_id, 'internal_note_added',
        jsonb_build_object('note_id', NEW.id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activity_on_note_added ON public.complaint_notes;
CREATE TRIGGER trg_activity_on_note_added
AFTER INSERT ON public.complaint_notes
FOR EACH ROW
EXECUTE FUNCTION public.log_internal_note_added_activity();

-- 5. Trigger: Automatically log status, priority, and assignment changes on complaints
CREATE OR REPLACE FUNCTION public.log_complaints_activity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_type TEXT;
BEGIN
    v_actor_id := auth.uid();
    v_actor_type := CASE WHEN v_actor_id IS NOT NULL THEN 'staff' ELSE 'system' END;

    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.complaint_activity (
            complaint_id,
            actor_type,
            actor_id,
            activity_type,
            metadata
        ) VALUES (
            NEW.id,
            v_actor_type,
            v_actor_id,
            'status_changed',
            jsonb_build_object(
                'previous_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;

    -- Priority change
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO public.complaint_activity (
            complaint_id,
            actor_type,
            actor_id,
            activity_type,
            metadata
        ) VALUES (
            NEW.id,
            v_actor_type,
            v_actor_id,
            'priority_changed',
            jsonb_build_object(
                'previous_priority', OLD.priority,
                'new_priority', NEW.priority
            )
        );
    END IF;

    -- Assignment change
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.complaint_activity (
            complaint_id,
            actor_type,
            actor_id,
            activity_type,
            metadata
        ) VALUES (
            NEW.id,
            v_actor_type,
            v_actor_id,
            CASE 
                WHEN NEW.assigned_to IS NULL THEN 'unassigned'
                ELSE 'assigned'
            END,
            jsonb_build_object(
                'previous_assignee', OLD.assigned_to,
                'new_assignee', NEW.assigned_to
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_complaint_activity ON public.complaints;
DROP TRIGGER IF EXISTS trigger_complaints_activity_log ON public.complaints;
CREATE TRIGGER trigger_complaints_activity_log
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.log_complaints_activity_trigger();

-- 6. Trigger: Automatically log message events (staff and customer)
CREATE OR REPLACE FUNCTION public.log_message_activity_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'staff' THEN
        INSERT INTO public.complaint_activity (
            complaint_id,
            actor_type,
            actor_id,
            activity_type,
            metadata
        ) VALUES (
            NEW.complaint_id,
            'staff',
            NEW.sender_id,
            'staff_message_sent',
            jsonb_build_object('message_id', NEW.id)
        );
    ELSIF NEW.sender_type = 'customer' THEN
        INSERT INTO public.complaint_activity (
            complaint_id,
            actor_type,
            actor_id,
            activity_type,
            metadata
        ) VALUES (
            NEW.complaint_id,
            'customer',
            NULL,
            'customer_message_sent',
            jsonb_build_object('message_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_message_activity ON public.complaint_messages;
CREATE TRIGGER trigger_log_message_activity
AFTER INSERT ON public.complaint_messages
FOR EACH ROW
EXECUTE FUNCTION public.log_message_activity_trigger();
