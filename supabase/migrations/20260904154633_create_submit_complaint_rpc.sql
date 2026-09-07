-- ==============================================================================
-- Migration: Create submit_complaint RPC function
-- Version: 20260904154633
-- ==============================================================================

CREATE OR REPLACE FUNCTION submit_complaint(
    p_full_name TEXT,
    p_phone TEXT,
    p_subject TEXT,
    p_description TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_record complaints%ROWTYPE;
BEGIN
    -- Validate required parameters inside database
    IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
        RAISE EXCEPTION 'Full name is required';
    END IF;

    IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
        RAISE EXCEPTION 'Phone number is required';
    END IF;

    IF p_subject IS NULL OR TRIM(p_subject) = '' THEN
        RAISE EXCEPTION 'Subject is required';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RAISE EXCEPTION 'Complaint description is required';
    END IF;

    INSERT INTO complaints (
        full_name,
        phone,
        subject,
        description,
        email,
        status,
        priority
    ) VALUES (
        TRIM(p_full_name),
        TRIM(p_phone),
        TRIM(p_subject),
        TRIM(p_description),
        NULLIF(TRIM(p_email), ''),
        'new',
        'normal'
    )
    RETURNING * INTO v_new_record;

    RETURN jsonb_build_object(
        'id', v_new_record.id,
        'reference_number', v_new_record.reference_number,
        'status', v_new_record.status,
        'created_at', v_new_record.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_complaint(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
