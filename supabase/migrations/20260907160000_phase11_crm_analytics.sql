-- ==============================================================================
-- Migration: Phase 11 CRM Analytics, Reporting, and Operational Insights
-- Version: 20260907160000
-- ==============================================================================

-- 1. Add resolved_at and closed_at timestamp columns to complaints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'complaints' 
        AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN resolved_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'complaints' 
        AND column_name = 'closed_at'
    ) THEN
        ALTER TABLE public.complaints
        ADD COLUMN closed_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 2. Performance Indexes for Analytics Queries
CREATE INDEX IF NOT EXISTS idx_complaints_resolved_at ON public.complaints(resolved_at);
CREATE INDEX IF NOT EXISTS idx_complaints_closed_at ON public.complaints(closed_at);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);

-- 3. Trigger Function: Automatically set resolved_at and closed_at on status transitions
CREATE OR REPLACE FUNCTION public.set_complaint_resolution_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- When transitioning to resolved
    IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
        IF NEW.resolved_at IS NULL THEN
            NEW.resolved_at := now();
        END IF;
    END IF;

    -- When transitioning to closed
    IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN
        IF NEW.closed_at IS NULL THEN
            NEW.closed_at := now();
        END IF;
        -- If closed directly without prior resolved_at, record resolved_at as well
        IF NEW.resolved_at IS NULL THEN
            NEW.resolved_at := now();
        END IF;
    END IF;

    -- Preserve existing historical timestamps if reopened (per MVP requirements)
    -- Do not erase NEW.resolved_at or NEW.closed_at if reverting to open/pending

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_complaint_resolution_timestamps ON public.complaints;
CREATE TRIGGER trigger_set_complaint_resolution_timestamps
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.set_complaint_resolution_timestamps();

-- 4. Backfill historical resolved and closed timestamps using updated_at
UPDATE public.complaints
SET resolved_at = updated_at
WHERE status = 'resolved' AND resolved_at IS NULL;

UPDATE public.complaints
SET closed_at = updated_at,
    resolved_at = COALESCE(resolved_at, updated_at)
WHERE status = 'closed' AND closed_at IS NULL;
