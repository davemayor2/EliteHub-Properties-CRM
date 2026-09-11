-- ==============================================================================
-- Migration: Add SLA Policies, SLA Tracking Columns, and Customer Feedback
-- Safe, idempotent execution for Supabase SQL Editor
-- ==============================================================================

-- 1. Create sla_policies Table
CREATE TABLE IF NOT EXISTS public.sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IS NULL OR priority IN ('low', 'normal', 'high', 'urgent')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    first_response_hours INTEGER NOT NULL CHECK (first_response_hours > 0),
    resolution_hours INTEGER NOT NULL CHECK (resolution_hours > 0),
    warning_percentage INTEGER NOT NULL DEFAULT 75 CHECK (warning_percentage > 0 AND warning_percentage <= 100),
    auto_escalate BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index to prevent duplicate active policies
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_sla_policy_scope 
ON public.sla_policies (
    COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(priority, '')
) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sla_policies_is_active ON public.sla_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_sla_policies_department_id ON public.sla_policies(department_id);
CREATE INDEX IF NOT EXISTS idx_sla_policies_priority ON public.sla_policies(priority);

-- 2. Add SLA and Escalation tracking columns to complaints table
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS sla_policy_id UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS first_response_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_response_sla_breached BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS resolution_sla_breached BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_warning_sent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- 3. Add feedback audit columns to complaints table
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS feedback_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS feedback_email_sent_at TIMESTAMPTZ;

-- 4. Create customer_feedback table
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

CREATE INDEX IF NOT EXISTS idx_customer_feedback_complaint_id ON public.customer_feedback(complaint_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_token ON public.customer_feedback(feedback_token);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON public.customer_feedback(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_feedback_submitted_at ON public.customer_feedback(submitted_at);

-- 5. Seed Default Priority-Based and Global SLA Policies
INSERT INTO public.sla_policies (name, description, priority, department_id, first_response_hours, resolution_hours, warning_percentage, auto_escalate, is_active)
VALUES 
    ('Urgent Priority SLA', 'Immediate response target for critical complaints requiring rapid triage.', 'urgent', NULL, 2, 24, 75, true, true),
    ('High Priority SLA', 'High priority response target for severe or elevated complaints.', 'high', NULL, 8, 48, 75, true, true),
    ('Normal Priority SLA', 'Standard response and resolution timeframe for regular customer inquiries.', 'normal', NULL, 24, 120, 75, true, true),
    ('Low Priority SLA', 'Extended resolution timeframe for low urgency feedback and inquiries.', 'low', NULL, 48, 168, 75, false, true),
    ('Global Default SLA', 'Default fallback policy when no department or priority match exists.', NULL, NULL, 24, 120, 75, false, true)
ON CONFLICT DO NOTHING;

-- 6. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- SLA Policies: Read access for all authenticated staff
DROP POLICY IF EXISTS "Staff can read sla_policies" ON public.sla_policies;
CREATE POLICY "Staff can read sla_policies"
ON public.sla_policies FOR SELECT TO authenticated
USING (true);

-- SLA Policies: Full management for admins
DROP POLICY IF EXISTS "Admins can manage sla_policies" ON public.sla_policies;
CREATE POLICY "Admins can manage sla_policies"
ON public.sla_policies FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Customer Feedback: Read access for authenticated staff
DROP POLICY IF EXISTS "Staff read access to customer feedback" ON public.customer_feedback;
CREATE POLICY "Staff read access to customer feedback"
ON public.customer_feedback FOR SELECT TO authenticated
USING (true);

-- Customer Feedback: Full access for admins
DROP POLICY IF EXISTS "Admins full access to customer feedback" ON public.customer_feedback;
CREATE POLICY "Admins full access to customer feedback"
ON public.customer_feedback FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
