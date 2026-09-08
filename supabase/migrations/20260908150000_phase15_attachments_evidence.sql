-- ==============================================================================
-- Migration: Phase 15 Advanced Attachments, File Management, and Evidence Handling
-- Version: 20260908150000
-- ==============================================================================

-- 1. Ensure complaint-attachments private storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Enhance complaint_attachments Table
CREATE TABLE IF NOT EXISTS public.complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add Phase 15 columns if they do not already exist
ALTER TABLE public.complaint_attachments
    ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.complaint_messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS uploaded_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS original_filename TEXT,
    ADD COLUMN IF NOT EXISTS mime_type TEXT,
    ADD COLUMN IF NOT EXISTS attachment_type TEXT NOT NULL DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'customer_visible';

-- Add check constraints safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_attachment_type'
    ) THEN
        ALTER TABLE public.complaint_attachments
            ADD CONSTRAINT chk_attachment_type
            CHECK (attachment_type IN ('image', 'document', 'pdf', 'other'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_attachment_visibility'
    ) THEN
        ALTER TABLE public.complaint_attachments
            ADD CONSTRAINT chk_attachment_visibility
            CHECK (visibility IN ('customer_visible', 'internal'));
    END IF;
END $$;

-- Backfill legacy records to ensure consistency
UPDATE public.complaint_attachments
SET 
    storage_path = COALESCE(storage_path, file_path),
    original_filename = COALESCE(original_filename, file_name),
    mime_type = COALESCE(mime_type, file_type, 'application/octet-stream'),
    attachment_type = CASE 
        WHEN COALESCE(mime_type, file_type) ILIKE '%pdf%' OR COALESCE(file_name, original_filename) ILIKE '%.pdf' THEN 'pdf'
        WHEN COALESCE(mime_type, file_type) ILIKE 'image/%' OR COALESCE(file_name, original_filename) ~* '\.(jpg|jpeg|png|webp)$' THEN 'image'
        WHEN COALESCE(mime_type, file_type) ILIKE 'text/%' OR COALESCE(file_name, original_filename) ~* '\.(txt|csv|doc|docx)$' THEN 'document'
        ELSE 'other'
    END,
    visibility = COALESCE(visibility, 'customer_visible')
WHERE storage_path IS NULL OR original_filename IS NULL OR mime_type IS NULL;

-- Keep legacy and Phase 15 columns synchronized via trigger
CREATE OR REPLACE FUNCTION public.sync_attachment_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync storage_path <-> file_path
    IF NEW.storage_path IS NOT NULL AND (NEW.file_path IS NULL OR NEW.file_path = '') THEN
        NEW.file_path := NEW.storage_path;
    ELSIF NEW.file_path IS NOT NULL AND (NEW.storage_path IS NULL OR NEW.storage_path = '') THEN
        NEW.storage_path := NEW.file_path;
    END IF;

    -- Sync original_filename <-> file_name
    IF NEW.original_filename IS NOT NULL AND (NEW.file_name IS NULL OR NEW.file_name = '') THEN
        NEW.file_name := NEW.original_filename;
    ELSIF NEW.file_name IS NOT NULL AND (NEW.original_filename IS NULL OR NEW.original_filename = '') THEN
        NEW.original_filename := NEW.file_name;
    END IF;

    -- Sync mime_type <-> file_type
    IF NEW.mime_type IS NOT NULL AND (NEW.file_type IS NULL OR NEW.file_type = '') THEN
        NEW.file_type := NEW.mime_type;
    ELSIF NEW.file_type IS NOT NULL AND (NEW.mime_type IS NULL OR NEW.mime_type = '') THEN
        NEW.mime_type := NEW.file_type;
    END IF;

    -- Auto-infer attachment_type if other/unset
    IF NEW.attachment_type = 'other' OR NEW.attachment_type IS NULL THEN
        IF COALESCE(NEW.mime_type, NEW.file_type) ILIKE '%pdf%' OR COALESCE(NEW.original_filename, NEW.file_name) ILIKE '%.pdf' THEN
            NEW.attachment_type := 'pdf';
        ELSIF COALESCE(NEW.mime_type, NEW.file_type) ILIKE 'image/%' OR COALESCE(NEW.original_filename, NEW.file_name) ~* '\.(jpg|jpeg|png|webp)$' THEN
            NEW.attachment_type := 'image';
        ELSIF COALESCE(NEW.mime_type, NEW.file_type) ILIKE 'text/%' OR COALESCE(NEW.original_filename, NEW.file_name) ~* '\.(txt|csv|doc|docx)$' THEN
            NEW.attachment_type := 'document';
        ELSE
            NEW.attachment_type := 'other';
        END IF;
    END IF;

    -- Default visibility to customer_visible
    IF NEW.visibility IS NULL THEN
        NEW.visibility := 'customer_visible';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_attachment_columns ON public.complaint_attachments;
CREATE TRIGGER trg_sync_attachment_columns
BEFORE INSERT OR UPDATE ON public.complaint_attachments
FOR EACH ROW
EXECUTE FUNCTION public.sync_attachment_columns();

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint_id ON public.complaint_attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_message_id ON public.complaint_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_visibility ON public.complaint_attachments(visibility);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_storage_path ON public.complaint_attachments(storage_path);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_created_at ON public.complaint_attachments(created_at DESC);

-- 4. Row Level Security (RLS)
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated staff can view all complaint attachments
DROP POLICY IF EXISTS "staff_can_view_attachments" ON public.complaint_attachments;
CREATE POLICY "staff_can_view_attachments"
ON public.complaint_attachments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated staff can insert attachments
DROP POLICY IF EXISTS "staff_can_insert_attachments" ON public.complaint_attachments;
CREATE POLICY "staff_can_insert_attachments"
ON public.complaint_attachments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Admins can delete attachments
DROP POLICY IF EXISTS "admins_can_delete_attachments" ON public.complaint_attachments;
CREATE POLICY "admins_can_delete_attachments"
ON public.complaint_attachments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    )
);

-- 5. RPC: Attach Complaint File V2 (Supports Phase 15 fields)
CREATE OR REPLACE FUNCTION public.attach_complaint_file_v2(
    p_complaint_id UUID,
    p_original_filename TEXT,
    p_storage_path TEXT,
    p_mime_type TEXT,
    p_file_size BIGINT,
    p_attachment_type TEXT DEFAULT 'other',
    p_visibility TEXT DEFAULT 'customer_visible',
    p_message_id UUID DEFAULT NULL,
    p_uploaded_by_profile_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attachment complaint_attachments%ROWTYPE;
    v_clean_filename TEXT;
    v_clean_path TEXT;
    v_type TEXT;
    v_vis TEXT;
BEGIN
    -- Verify complaint exists
    IF NOT EXISTS (SELECT 1 FROM complaints WHERE id = p_complaint_id) THEN
        RAISE EXCEPTION 'Complaint with ID % does not exist', p_complaint_id;
    END IF;

    v_clean_filename := TRIM(p_original_filename);
    v_clean_path := TRIM(p_storage_path);
    v_type := COALESCE(NULLIF(TRIM(p_attachment_type), ''), 'other');
    v_vis := COALESCE(NULLIF(TRIM(p_visibility), ''), 'customer_visible');

    INSERT INTO complaint_attachments (
        complaint_id,
        message_id,
        uploaded_by_profile_id,
        storage_path,
        file_path,
        original_filename,
        file_name,
        file_size,
        mime_type,
        file_type,
        attachment_type,
        visibility
    ) VALUES (
        p_complaint_id,
        p_message_id,
        p_uploaded_by_profile_id,
        v_clean_path,
        v_clean_path,
        v_clean_filename,
        v_clean_filename,
        p_file_size,
        TRIM(p_mime_type),
        TRIM(p_mime_type),
        v_type,
        v_vis
    )
    RETURNING * INTO v_attachment;

    RETURN jsonb_build_object(
        'id', v_attachment.id,
        'complaint_id', v_attachment.complaint_id,
        'message_id', v_attachment.message_id,
        'storage_path', v_attachment.storage_path,
        'original_filename', v_attachment.original_filename,
        'file_size', v_attachment.file_size,
        'mime_type', v_attachment.mime_type,
        'attachment_type', v_attachment.attachment_type,
        'visibility', v_attachment.visibility,
        'created_at', v_attachment.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_complaint_file_v2(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, UUID, UUID) TO anon, authenticated, service_role;

-- 6. Update Customer Tracking Portal Attachment Retrieval RPCs
-- Strictly filter for customer_visible attachments so internal files are never leaked!
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
    SELECT COALESCE(a.storage_path, a.file_path) INTO v_file_path
    FROM public.complaint_attachments a
    JOIN public.complaints c ON c.id = a.complaint_id
    WHERE c.tracking_token = TRIM(p_token)
      AND c.tracking_token_revoked_at IS NULL
      AND a.id = p_attachment_id
      AND (a.visibility = 'customer_visible' OR a.visibility IS NULL);

    RETURN v_file_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_attachment_path_by_token(TEXT, UUID) TO anon, authenticated, service_role;

-- 7. Update get_customer_complaint_by_token to strictly return customer_visible attachments
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

    -- Fetch ONLY customer-visible attachments
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'file_name', COALESCE(original_filename, file_name),
                'original_filename', COALESCE(original_filename, file_name),
                'file_type', COALESCE(mime_type, file_type),
                'mime_type', COALESCE(mime_type, file_type),
                'file_size', file_size,
                'attachment_type', attachment_type,
                'message_id', message_id,
                'created_at', created_at
            ) ORDER BY created_at ASC
        ),
        '[]'::jsonb
    )
    INTO v_attachments
    FROM public.complaint_attachments
    WHERE complaint_id = v_complaint.id
      AND (visibility = 'customer_visible' OR visibility IS NULL);

    -- Fetch customer-safe messages
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
        'id', v_complaint.id,
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
