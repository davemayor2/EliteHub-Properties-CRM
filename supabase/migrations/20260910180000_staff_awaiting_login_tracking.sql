-- ==============================================================================
-- Migration: 20260910180000_staff_awaiting_login_tracking.sql
-- Description: Staff Directory Awaiting First Login Tracking & Temporary Password Support
-- ==============================================================================

-- 1. Helper RPC to fetch the full staff directory enriched with login state from auth.users
CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    has_logged_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Verify caller is an active administrator
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required.';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.email,
        p.role,
        p.is_active,
        p.created_at,
        p.updated_at,
        u.last_sign_in_at,
        (u.last_sign_in_at IS NOT NULL) AS has_logged_in
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_staff_directory() IS
    'Returns the full staff directory for active admins, enriched with last_sign_in_at from auth.users.';
