-- ==============================================================================
-- PHASE 14: CUSTOMER SATISFACTION, FEEDBACK, AND SERVICE QUALITY MEASUREMENT
-- ==============================================================================
-- Migration creates customer_feedback table, rating constraints, indexes,
-- feedback tracking columns on complaints, and RLS policies.
-- ==============================================================================

-- 1. Create customer_feedback table
CREATE TABLE IF NOT EXISTS public.customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    comment TEXT,
    feedback_token TEXT NOT NULL UNIQUE,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT customer_feedback_complaint_id_key UNIQUE (complaint_id)
);

-- 2. Add feedback audit columns to complaints table
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS feedback_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS feedback_email_sent_at TIMESTAMPTZ;

-- 3. Create high-performance query indexes
CREATE INDEX IF NOT EXISTS idx_customer_feedback_complaint_id
ON public.customer_feedback(complaint_id);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_token
ON public.customer_feedback(feedback_token);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating
ON public.customer_feedback(rating)
WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_feedback_submitted_at
ON public.customer_feedback(submitted_at);

-- 4. Enable Row Level Security
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Admins have full access for reporting, management, and review
DROP POLICY IF EXISTS "Admins full access to customer feedback" ON public.customer_feedback;
CREATE POLICY "Admins full access to customer feedback"
ON public.customer_feedback
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND (profiles.is_active IS NULL OR profiles.is_active = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND (profiles.is_active IS NULL OR profiles.is_active = true)
    )
);

-- Staff members have read-only access to customer feedback
DROP POLICY IF EXISTS "Staff read access to customer feedback" ON public.customer_feedback;
CREATE POLICY "Staff read access to customer feedback"
ON public.customer_feedback
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.is_active IS NULL OR profiles.is_active = true)
    )
);

-- Public users cannot query customer_feedback directly; submissions and lookups
-- happen securely via server endpoints validating feedback_token with service role / admin client.
DROP POLICY IF EXISTS "Public direct query blocked on customer feedback" ON public.customer_feedback;
CREATE POLICY "Public direct query blocked on customer feedback"
ON public.customer_feedback
FOR SELECT
TO anon
USING (false);
