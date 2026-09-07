-- ==============================================================================
-- Migration: Create attach_complaint_file and rollback RPC functions
-- Version: 20260904171030
-- ==============================================================================

-- RPC to securely insert an attachment record linked to a complaint
CREATE OR REPLACE FUNCTION attach_complaint_file(
    p_complaint_id UUID,
    p_file_name TEXT,
    p_file_path TEXT,
    p_file_type TEXT,
    p_file_size BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attachment complaint_attachments%ROWTYPE;
BEGIN
    -- Ensure the complaint exists
    IF NOT EXISTS (SELECT 1 FROM complaints WHERE id = p_complaint_id) THEN
        RAISE EXCEPTION 'Complaint with ID % does not exist', p_complaint_id;
    END IF;

    INSERT INTO complaint_attachments (
        complaint_id,
        file_name,
        file_path,
        file_type,
        file_size
    ) VALUES (
        p_complaint_id,
        TRIM(p_file_name),
        TRIM(p_file_path),
        NULLIF(TRIM(p_file_type), ''),
        p_file_size
    )
    RETURNING * INTO v_attachment;

    RETURN jsonb_build_object(
        'id', v_attachment.id,
        'complaint_id', v_attachment.complaint_id,
        'file_name', v_attachment.file_name,
        'file_path', v_attachment.file_path,
        'file_size', v_attachment.file_size,
        'created_at', v_attachment.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION attach_complaint_file(UUID, TEXT, TEXT, TEXT, BIGINT) TO anon, authenticated, service_role;

-- RPC to rollback complaint record if subsequent attachment handling fails
CREATE OR REPLACE FUNCTION rollback_complaint_submission(
    p_complaint_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM complaints WHERE id = p_complaint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rollback_complaint_submission(UUID) TO anon, authenticated, service_role;
