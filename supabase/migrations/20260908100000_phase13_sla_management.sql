-- ==============================================================================
-- Migration: Phase 13 SLA Management, Escalations, and Complaint Resolution Workflows
-- Version: 20260908100000
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

-- Partial unique index to prevent duplicate active policies with identical department and priority specificity
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_sla_policy_scope 
ON public.sla_policies (
    COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(priority, '')
) 
WHERE is_active = true;

-- Indexes for SLA Policies
CREATE INDEX IF NOT EXISTS idx_sla_policies_is_active ON public.sla_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_sla_policies_department_id ON public.sla_policies(department_id);
CREATE INDEX IF NOT EXISTS idx_sla_policies_priority ON public.sla_policies(priority);

-- 2. Add SLA and Escalation tracking columns to complaints table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'sla_policy_id'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN sla_policy_id UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'first_response_due_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN first_response_due_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'first_responded_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN first_responded_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'resolution_due_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN resolution_due_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'closed_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN closed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'is_escalated'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN is_escalated BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'escalated_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN escalated_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'first_response_sla_breached'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN first_response_sla_breached BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'resolution_sla_breached'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN resolution_sla_breached BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'sla_warning_sent'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN sla_warning_sent BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'complaints' AND column_name = 'escalation_reason'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN escalation_reason TEXT;
    END IF;
END $$;

-- Indexes for SLA query performance
CREATE INDEX IF NOT EXISTS idx_complaints_first_response_due ON public.complaints(first_response_due_at);
CREATE INDEX IF NOT EXISTS idx_complaints_resolution_due ON public.complaints(resolution_due_at);
CREATE INDEX IF NOT EXISTS idx_complaints_is_escalated ON public.complaints(is_escalated);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_policy_id ON public.complaints(sla_policy_id);

-- 3. Seed Default Priority-Based and Global SLA Policies
INSERT INTO public.sla_policies (name, description, priority, department_id, first_response_hours, resolution_hours, warning_percentage, auto_escalate, is_active)
VALUES 
    ('Urgent Priority SLA', 'Immediate response target for critical complaints requiring rapid triage.', 'urgent', NULL, 2, 24, 75, true, true),
    ('High Priority SLA', 'High priority response target for severe or elevated complaints.', 'high', NULL, 8, 48, 75, true, true),
    ('Normal Priority SLA', 'Standard response and resolution timeframe for regular customer inquiries.', 'normal', NULL, 24, 120, 75, true, true),
    ('Low Priority SLA', 'Extended resolution timeframe for low urgency feedback and inquiries.', 'low', NULL, 48, 168, 75, false, true),
    ('Global Default SLA', 'Default fallback policy when no department or priority match exists.', NULL, NULL, 24, 120, 75, false, true)
ON CONFLICT DO NOTHING;

-- 4. Set updated_at trigger on sla_policies
CREATE OR REPLACE FUNCTION public.set_sla_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sla_policies_updated_at ON public.sla_policies;
CREATE TRIGGER trg_sla_policies_updated_at
BEFORE UPDATE ON public.sla_policies
FOR EACH ROW
EXECUTE FUNCTION public.set_sla_policies_updated_at();

-- 5. Row Level Security Policies for sla_policies
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

-- Admins: Full management access (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admins can manage sla_policies" ON public.sla_policies;
CREATE POLICY "Admins can manage sla_policies"
ON public.sla_policies
FOR ALL
TO authenticated
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

-- Staff: Read-only access for complaint management
DROP POLICY IF EXISTS "Staff can read sla_policies" ON public.sla_policies;
CREATE POLICY "Staff can read sla_policies"
ON public.sla_policies
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.status != 'inactive'
    )
);
