-- ==============================================================================
-- Migration: Add RLS SELECT Policies for Authenticated Staff on Complaints
-- Version: 20260905230000
-- ==============================================================================

-- 1. Enable Authenticated Staff to SELECT from public.complaints
DROP POLICY IF EXISTS "Authenticated staff can view complaints" ON public.complaints;
CREATE POLICY "Authenticated staff can view complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Enable Authenticated Staff to SELECT from public.complaint_attachments
DROP POLICY IF EXISTS "Authenticated staff can view complaint attachments" ON public.complaint_attachments;
CREATE POLICY "Authenticated staff can view complaint attachments"
ON public.complaint_attachments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. Helper RPC to fetch complaint statistics efficiently in a single query
CREATE OR REPLACE FUNCTION public.get_complaint_statistics()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'new', count(*) FILTER (WHERE status = 'new'),
    'open', count(*) FILTER (WHERE status = 'open'),
    'pending', count(*) FILTER (WHERE status = 'pending'),
    'resolved', count(*) FILTER (WHERE status = 'resolved'),
    'closed', count(*) FILTER (WHERE status = 'closed')
  )
  FROM public.complaints;
$$;

GRANT EXECUTE ON FUNCTION public.get_complaint_statistics() TO authenticated, service_role;
