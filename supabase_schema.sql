-- ==============================================================================
-- AEOWA: Anugraha Evergreen Owners Welfare Association
-- Supabase PostgreSQL Database Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PLOTS table
CREATE TABLE IF NOT EXISTS public.plots (
    id TEXT PRIMARY KEY,
    plot_number TEXT UNIQUE NOT NULL,
    primary_owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'vacant',
    membership_paid BOOLEAN DEFAULT true,
    merged_into TEXT,
    merged_plots JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create SERVICE_REQUESTS table
CREATE TABLE IF NOT EXISTS public.service_requests (
    id TEXT PRIMARY KEY,
    plot_number TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    rules_accepted_at TEXT,
    contractor_phone TEXT,
    supervisor_phone TEXT,
    emergency_phone TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    pre_construction_checklist JSONB,
    re_measurement_checklist JSONB,
    post_construction_refund JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 5. Policies: Allow public read/write via Service Role or Anon API (controlled by Next.js Backend)
CREATE POLICY "Allow public read plots" ON public.plots
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated/service all plots" ON public.plots
    FOR ALL USING (true);

CREATE POLICY "Allow public read requests" ON public.service_requests
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert requests" ON public.service_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update requests" ON public.service_requests
    FOR UPDATE USING (true);

-- 6. Insert initial seed plots (sample layout plots)
INSERT INTO public.plots (id, plot_number, primary_owner_name, phone, email, status, membership_paid)
VALUES
    ('plot-1', '12', 'Kavitha Sundaram', '9845012345', 'kavitha.sundaram@example.com', 'vacant', true),
    ('plot-2', '27', 'Rajesh Venkatraman', '9880198801', 'rajesh.v@example.com', 'under_construction', true),
    ('plot-3', '42', 'Anand Kumar Hegde', '9448123456', 'anand.hegde@example.com', 'vacant', true),
    ('plot-4', '58', 'Meenakshi Iyer', '9900223344', 'meenakshi.iyer@example.com', 'vacant', true),
    ('plot-5', '14', 'Dr. Srinivas Murthy', '9844055667', 'dr.srinivas@example.com', 'vacant', true),
    ('plot-6', '15', 'Dr. Srinivas Murthy', '9844055667', 'dr.srinivas@example.com', 'vacant', true),
    ('plot-7', '73', 'Praveen Chordia', '9740112233', 'praveen.chordia@example.com', 'constructed', true),
    ('plot-8', '88', 'Girish Babu', '9886001122', 'girish.babu@example.com', 'vacant', true),
    ('plot-9', '104', 'Sunil Narang', '9845112244', 'sunil.narang@example.com', 'vacant', true),
    ('plot-10', '118', 'Deepa & R. Natarajan', '9980334455', 'natarajan.r@example.com', 'vacant', true)
ON CONFLICT (plot_number) DO NOTHING;

-- 7. Supabase Storage Bucket for Resident Documents (1GB free, zero quota hurdles)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public storage insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public storage select"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- 8. Add extended metadata columns to service_requests (Idempotent: safe to run on existing tables)
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS owner_contact_name TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS owner_contact_phone TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS contractor_name TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS sale_deed_details JSONB;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS amalgamation_details JSONB;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS generated_noc_pdf_url TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS generated_noc_certificate_id TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS refund_settlement_pdf_url TEXT;

