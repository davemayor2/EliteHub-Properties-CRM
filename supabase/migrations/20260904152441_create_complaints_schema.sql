-- ==============================================================================
-- Migration: Create Complaints Schema for EliteHub Properties Customer Care Portal
-- Version: 20260904152441
-- ==============================================================================

-- 1. Sequence for Reference Number Generation
CREATE SEQUENCE IF NOT EXISTS complaint_reference_seq START WITH 1 INCREMENT BY 1;

-- 2. Reference Number Generator Function (Format: EH-YYYY-XXXXX)
CREATE OR REPLACE FUNCTION generate_complaint_reference_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    seq_val BIGINT;
BEGIN
    current_year := to_char(CURRENT_DATE, 'YYYY');
    seq_val := nextval('complaint_reference_seq');
    RETURN 'EH-' || current_year || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Complaints Primary Table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE DEFAULT generate_complaint_reference_number(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'pending', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Trigger Function & Trigger for Reference Number Assignment Fallback
CREATE OR REPLACE FUNCTION set_complaint_reference_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
        NEW.reference_number := generate_complaint_reference_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_complaint_reference_number ON complaints;
CREATE TRIGGER trigger_set_complaint_reference_number
BEFORE INSERT ON complaints
FOR EACH ROW
EXECUTE FUNCTION set_complaint_reference_number();

-- 5. Trigger Function & Trigger for updated_at Automation
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_complaints_updated_at ON complaints;
CREATE TRIGGER trigger_complaints_updated_at
BEFORE UPDATE ON complaints
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 6. Complaint Attachments Table
CREATE TABLE IF NOT EXISTS complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_email ON complaints(email);
CREATE INDEX IF NOT EXISTS idx_complaints_phone ON complaints(phone);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint_id ON complaint_attachments(complaint_id);

-- 8. Row Level Security (RLS)
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_attachments ENABLE ROW LEVEL SECURITY;
