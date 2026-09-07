-- ==============================================================================
-- Migration: Helper function for secure admin creation of staff users
-- Version: 20260905223000
-- ==============================================================================

-- Helper function to auto-confirm email for staff users if needed
CREATE OR REPLACE FUNCTION public.confirm_staff_user_email(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_staff_user_email(UUID) TO service_role;
