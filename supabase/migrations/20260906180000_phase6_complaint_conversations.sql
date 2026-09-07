-- ==============================================================================
-- Migration: Phase 6 Complaint Conversations and Staff Responses
-- Version: 20260906180000
-- ==============================================================================

-- 1. Create complaint_messages table
CREATE TABLE IF NOT EXISTS public.complaint_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('staff', 'customer', 'system')),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint_id ON public.complaint_messages(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_created_at ON public.complaint_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_sender_type ON public.complaint_messages(sender_type);

-- 3. Row Level Security (RLS)
ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated staff can view all complaint messages
DROP POLICY IF EXISTS "Authenticated staff can view complaint messages" ON public.complaint_messages;
CREATE POLICY "Authenticated staff can view complaint messages"
ON public.complaint_messages
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated staff can insert messages
DROP POLICY IF EXISTS "Authenticated staff can insert complaint messages" ON public.complaint_messages;
CREATE POLICY "Authenticated staff can insert complaint messages"
ON public.complaint_messages
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        (sender_type = 'staff' AND sender_id = auth.uid())
        OR
        (sender_type = 'system' AND sender_id IS NULL)
    )
);

-- 4. Trigger Function: Automatically create "Complaint submitted." system message on new complaints
CREATE OR REPLACE FUNCTION public.handle_new_complaint_system_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.complaint_messages (
        complaint_id,
        sender_type,
        sender_id,
        message,
        created_at
    ) VALUES (
        NEW.id,
        'system',
        NULL,
        'Complaint submitted.',
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_complaint_system_message ON public.complaints;
CREATE TRIGGER trigger_new_complaint_system_message
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_complaint_system_message();

-- 5. Trigger Function: First staff response transitions 'new' complaint to 'open'
CREATE OR REPLACE FUNCTION public.handle_staff_first_response_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'staff' THEN
        -- Only transition if the complaint is currently 'new'
        UPDATE public.complaints
        SET status = 'open', updated_at = now()
        WHERE id = NEW.complaint_id AND status = 'new';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_staff_first_response_status ON public.complaint_messages;
CREATE TRIGGER trigger_staff_first_response_status
AFTER INSERT ON public.complaint_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_staff_first_response_status();

-- 6. One-time backfill: ensure existing complaints have the initial "Complaint submitted." event
INSERT INTO public.complaint_messages (complaint_id, sender_type, sender_id, message, created_at)
SELECT c.id, 'system', NULL, 'Complaint submitted.', c.created_at
FROM public.complaints c
WHERE NOT EXISTS (
    SELECT 1 FROM public.complaint_messages m
    WHERE m.complaint_id = c.id AND m.sender_type = 'system' AND m.message = 'Complaint submitted.'
);
