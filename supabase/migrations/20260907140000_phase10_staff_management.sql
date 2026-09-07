-- ==============================================================================
-- Migration: Phase 10 Staff Management, Roles, and Administrative Controls
-- Version: 20260907140000
-- ==============================================================================

-- 1. Add is_active column to public.profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 2. Performance Index for is_active
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 3. Update public.is_admin() to require is_active = true
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 4. Helper RPC to update staff member with strict safety constraints
CREATE OR REPLACE FUNCTION public.admin_update_staff(
    p_target_id UUID,
    p_full_name TEXT,
    p_role TEXT,
    p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_target_profile public.profiles%ROWTYPE;
    v_active_admins_count INT;
BEGIN
    v_caller_id := auth.uid();

    -- Verify caller is an active admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required.';
    END IF;

    -- Fetch target profile
    SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_target_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff member not found.';
    END IF;

    -- Validate role
    IF p_role NOT IN ('admin', 'staff') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be admin or staff.', p_role;
    END IF;

    -- Safeguard 1: Prevent an admin from deactivating their own account
    IF v_caller_id = p_target_id AND p_is_active = false THEN
        RAISE EXCEPTION 'Security restriction: You cannot deactivate your own administrator account.';
    END IF;

    -- Safeguard 2: Prevent an admin from demoting themselves to staff
    IF v_caller_id = p_target_id AND p_role = 'staff' AND v_target_profile.role = 'admin' THEN
        RAISE EXCEPTION 'Security restriction: You cannot remove your own administrator role. Another administrator must perform this action.';
    END IF;

    -- Safeguard 3: If target is currently an active admin and is being demoted or deactivated,
    -- ensure at least one other active admin remains in the system
    IF v_target_profile.role = 'admin' AND v_target_profile.is_active = true AND (p_role = 'staff' OR p_is_active = false) THEN
        SELECT count(*) INTO v_active_admins_count
        FROM public.profiles
        WHERE role = 'admin' AND is_active = true AND id != p_target_id;

        IF v_active_admins_count < 1 THEN
            RAISE EXCEPTION 'Security restriction: Cannot demote or deactivate this user. The system must have at least one active administrator.';
        END IF;
    END IF;

    -- Perform update
    UPDATE public.profiles
    SET
        full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
        role = p_role,
        is_active = p_is_active,
        updated_at = now()
    WHERE id = p_target_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Staff member updated successfully.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_staff(UUID, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

-- 5. Helper RPC to create staff member with admin privileges
CREATE OR REPLACE FUNCTION public.admin_create_staff_user(
    p_full_name TEXT,
    p_email TEXT,
    p_role TEXT,
    p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_existing_id UUID;
    v_hashed_pw TEXT;
    v_clean_email TEXT;
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required.';
    END IF;

    v_clean_email := LOWER(TRIM(p_email));

    -- Check if user already exists
    SELECT id INTO v_existing_id FROM auth.users WHERE LOWER(email) = v_clean_email;
    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'An account with this email address already exists.';
    END IF;

    -- Generate password hash if password provided, otherwise use random secure temp
    IF p_password IS NOT NULL AND LENGTH(TRIM(p_password)) >= 8 THEN
        v_hashed_pw := crypt(TRIM(p_password), gen_salt('bf'));
    ELSE
        v_hashed_pw := crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf'));
    END IF;

    v_user_id := gen_random_uuid();

    -- Insert into auth.users (triggers on_auth_user_created)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_clean_email,
        v_hashed_pw,
        now(),
        now(),
        NULL,
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', TRIM(p_full_name), 'role', p_role),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- Ensure is_active is true on the profile
    UPDATE public.profiles
    SET is_active = true, role = p_role, full_name = TRIM(p_full_name)
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', v_clean_email,
        'full_name', TRIM(p_full_name),
        'role', p_role
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_staff_user(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
