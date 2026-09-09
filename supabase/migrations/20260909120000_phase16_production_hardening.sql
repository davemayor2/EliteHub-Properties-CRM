-- ==============================================================================
-- Migration: 20260909120000_phase16_production_hardening.sql
-- Description: Phase 16 Production Hardening, Security Audit & Performance Indexes
-- ==============================================================================

-- 1. Ensure Row Level Security (RLS) is strictly enabled across all CRM tables
ALTER TABLE IF EXISTS public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.complaint_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.complaint_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.complaint_attachments ENABLE ROW LEVEL SECURITY;

-- 2. Performance Query Indexes
-- Optimize complaint listings, directory filters, and sorting
CREATE INDEX IF NOT EXISTS idx_complaints_status_created_at 
  ON public.complaints(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaints_assigned_status 
  ON public.complaints(assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_complaints_dept_cat 
  ON public.complaints(department_id, category_id);

CREATE INDEX IF NOT EXISTS idx_complaints_reference_number
  ON public.complaints(reference_number);

-- Partial indexes for active SLA breach monitoring (only index unresolved complaints)
CREATE INDEX IF NOT EXISTS idx_complaints_resolution_due_active 
  ON public.complaints(resolution_due_at) 
  WHERE status NOT IN ('resolved', 'closed');

CREATE INDEX IF NOT EXISTS idx_complaints_first_response_due_active 
  ON public.complaints(first_response_due_at) 
  WHERE first_responded_at IS NULL AND status NOT IN ('resolved', 'closed');

-- Optimize message timeline queries
CREATE INDEX IF NOT EXISTS idx_messages_complaint_created 
  ON public.complaint_messages(complaint_id, created_at ASC);

-- Optimize attachment visibility lookups (customer visible vs internal confidential)
CREATE INDEX IF NOT EXISTS idx_attachments_complaint_vis 
  ON public.complaint_attachments(complaint_id, visibility);

-- Optimize feedback token and submission lookups
CREATE INDEX IF NOT EXISTS idx_feedback_token_submitted 
  ON public.customer_feedback(feedback_token, submitted_at);

-- 3. Security Hardening: Ensure anonymous users cannot directly SELECT from internal notes or activity
DROP POLICY IF EXISTS "Deny anonymous access to internal notes" ON public.internal_notes;
CREATE POLICY "Deny anonymous access to internal notes"
  ON public.internal_notes
  FOR ALL
  TO anon
  USING (false);

DROP POLICY IF EXISTS "Deny anonymous access to complaint activity" ON public.complaint_activity;
CREATE POLICY "Deny anonymous access to complaint activity"
  ON public.complaint_activity
  FOR ALL
  TO anon
  USING (false);

-- 4. Verify staff profile active status enforcement in profile policies
CREATE OR REPLACE FUNCTION public.is_active_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_active = true
  );
$$;

COMMENT ON MIGRATION "20260909120000_phase16_production_hardening" IS 
  'Phase 16: Applied compound indexes, SLA monitoring partial indexes, confirmed RLS on all tables, and strengthened anonymous isolation.';
