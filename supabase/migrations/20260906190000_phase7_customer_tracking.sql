-- ==============================================================================
-- Migration: Phase 7 Secure Customer Complaint Tracking Portal
-- Version: 20260906190000
-- ==============================================================================

-- 1. Function to generate a cryptographically secure 64-character (32-byte) random tracking token
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;

-- 2. Add tracking_token column to public.complaints if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'complaints' 
        AND column_name = 'tracking_token'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN tracking_token TEXT NOT NULL DEFAULT public.generate_tracking_token(),
        ADD COLUMN tracking_token_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ADD COLUMN tracking_token_revoked_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Ensure all existing complaints have a unique tracking_token
UPDATE public.complaints
SET tracking_token = public.generate_tracking_token()
WHERE tracking_token IS NULL OR tracking_token = '';

-- 4. Unique Index on tracking_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_tracking_token ON public.complaints(tracking_token);

-- 5. Trigger to automatically generate tracking_token if not provided
CREATE OR REPLACE FUNCTION public.set_complaint_tracking_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_token IS NULL OR NEW.tracking_token = '' THEN
        NEW.tracking_token := public.generate_tracking_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_complaint_tracking_token ON public.complaints;
CREATE TRIGGER trigger_set_complaint_tracking_token
BEFORE INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.set_complaint_tracking_token();

-- 6. Trigger: Customer reply automatically transitions 'pending' complaint to 'open'
CREATE OR REPLACE FUNCTION public.handle_customer_reply_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'customer' THEN
        UPDATE public.complaints
        SET status = 'open', updated_at = now()
        WHERE id = NEW.complaint_id AND status = 'pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_customer_reply_status ON public.complaint_messages;
CREATE TRIGGER trigger_customer_reply_status
AFTER INSERT ON public.complaint_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_customer_reply_status();

-- 7. Secure Customer RPC: Get complaint data strictly by tracking token (SECURITY DEFINER)
-- Excludes internal priority, staff IDs, internal notes, and internal UUIDs.
CREATE OR REPLACE FUNCTION public.get_customer_complaint_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_complaint RECORD;
    v_attachments JSONB;
    v_messages JSONB;
BEGIN
    IF p_token IS NULL OR TRIM(p_token) = '' THEN
        RETURN NULL;
    END IF;

    -- Fetch complaint
    SELECT 
        id,
        reference_number,
        subject,
        description,
        status,
        created_at,
        updated_at,
        tracking_token
    INTO v_complaint
    FROM public.complaints
    WHERE tracking_token = TRIM(p_token)
      AND tracking_token_revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Fetch customer-safe attachments
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'file_name', file_name,
                'file_type', file_type,
                'file_size', file_size,
                'created_at', created_at
            ) ORDER BY created_at ASC
        ),
        '[]'::jsonb
    )
    INTO v_attachments
    FROM public.complaint_attachments
    WHERE complaint_id = v_complaint.id;

    -- Fetch customer-safe messages (anonymizing staff sender to 'EliteHub Properties Customer Care')
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'sender_type', sender_type,
                'sender_name', CASE 
                    WHEN sender_type = 'customer' THEN 'You'
                    WHEN sender_type = 'staff' THEN 'EliteHub Properties Customer Care'
                    ELSE 'System'
                END,
                'message', message,
                'created_at', created_at
            ) ORDER BY created_at ASC
        ),
        '[]'::jsonb
    )
    INTO v_messages
    FROM public.complaint_messages
    WHERE complaint_id = v_complaint.id;

    RETURN jsonb_build_object(
        'reference_number', v_complaint.reference_number,
        'subject', v_complaint.subject,
        'description', v_complaint.description,
        'status', v_complaint.status,
        'created_at', v_complaint.created_at,
        'updated_at', v_complaint.updated_at,
        'tracking_token', v_complaint.tracking_token,
        'attachments', v_attachments,
        'messages', v_messages
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_complaint_by_token(TEXT) TO anon, authenticated, service_role;

-- 8. Secure Customer RPC: Submit a customer response strictly by tracking token (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_customer_message_by_token(
    p_token TEXT,
    p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_complaint RECORD;
    v_message RECORD;
    v_refreshed_status TEXT;
BEGIN
    IF p_token IS NULL OR TRIM(p_token) = '' THEN
        RAISE EXCEPTION 'Invalid tracking token';
    END IF;

    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'Message content cannot be empty';
    END IF;

    -- Validate complaint access
    SELECT id, status INTO v_complaint
    FROM public.complaints
    WHERE tracking_token = TRIM(p_token)
      AND tracking_token_revoked_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found or link is no longer valid';
    END IF;

    -- Insert customer message
    INSERT INTO public.complaint_messages (
        complaint_id,
        sender_type,
        sender_id,
        message
    ) VALUES (
        v_complaint.id,
        'customer',
        NULL,
        TRIM(p_message)
    )
    RETURNING * INTO v_message;

    -- Fetch refreshed status (in case trigger transitioned 'pending' to 'open')
    SELECT status INTO v_refreshed_status
    FROM public.complaints
    WHERE id = v_complaint.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', jsonb_build_object(
            'id', v_message.id,
            'sender_type', 'customer',
            'sender_name', 'You',
            'message', v_message.message,
            'created_at', v_message.created_at
        ),
        'status', v_refreshed_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_customer_message_by_token(TEXT, TEXT) TO anon, authenticated, service_role;

-- 9. Secure Customer RPC: Validate token and return attachment storage path for signed URL generation
CREATE OR REPLACE FUNCTION public.get_customer_attachment_path_by_token(
    p_token TEXT,
    p_attachment_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_file_path TEXT;
BEGIN
    SELECT a.file_path INTO v_file_path
    FROM public.complaint_attachments a
    JOIN public.complaints c ON c.id = a.complaint_id
    WHERE c.tracking_token = TRIM(p_token)
      AND c.tracking_token_revoked_at IS NULL
      AND a.id = p_attachment_id;

    RETURN v_file_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_attachment_path_by_token(TEXT, UUID) TO anon, authenticated, service_role;
