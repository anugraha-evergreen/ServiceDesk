-- =========================================================================
-- Anugraha Evergreen Layout Residents' Association - Supabase Schema
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Master Plots Table
CREATE TABLE IF NOT EXISTS plots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_number VARCHAR(50) NOT NULL UNIQUE,
  primary_owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  dimensions VARCHAR(50) DEFAULT '30 x 40 ft',
  area_sq_ft INTEGER DEFAULT 1200,
  status VARCHAR(30) DEFAULT 'vacant' CHECK (status IN ('vacant', 'under_construction', 'constructed')),
  merged_into VARCHAR(50),
  merged_plots JSONB DEFAULT '[]'::jsonb,
  maintenance_cleared_till DATE,
  membership_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Service Requests Table (Construction NOC, Re-Measurement, Sale Deed, Amalgamation)
CREATE TABLE IF NOT EXISTS service_requests (
  id VARCHAR(50) PRIMARY KEY, -- e.g. REQ-2026-101
  plot_number VARCHAR(50) NOT NULL REFERENCES plots(plot_number) ON DELETE CASCADE,
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  type VARCHAR(40) NOT NULL CHECK (type IN ('construction_noc', 'remeasurement_noc', 'sale_deed', 'plot_amalgamation')),
  status VARCHAR(40) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'checklist_pending', 'approved', 'rejected', 'completed')),
  
  -- Construction NOC specific
  rules_accepted_at TIMESTAMPTZ,
  contractor_phone VARCHAR(20),
  supervisor_phone VARCHAR(20),
  emergency_phone VARCHAR(20),
  
  -- Pre-construction checklist summary
  checklist_completed BOOLEAN DEFAULT false,
  deposit_transaction_id VARCHAR(100),
  deposit_date DATE,
  deposit_bank VARCHAR(100),
  
  -- Amalgamation & Sale deed metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Certificate metadata
  generated_noc_certificate_id VARCHAR(100),
  generated_noc_pdf_drive_id VARCHAR(255),
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documents Table (STRICT PRIVACY: drive_web_view_link accessible ONLY to Admins)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id VARCHAR(50) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  plot_number VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  drive_file_id VARCHAR(255),
  drive_web_view_link TEXT, -- STRICT: Never expose to owner role
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pre-Construction Checklists Table
CREATE TABLE IF NOT EXISTS pre_construction_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id VARCHAR(50) NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
  docs_verified BOOLEAN DEFAULT false,
  membership_fee_cleared BOOLEAN DEFAULT false, -- ₹1,000
  maintenance_dues_cleared BOOLEAN DEFAULT false,
  security_deposit_paid BOOLEAN DEFAULT false, -- ₹20,000
  deposit_transaction_id VARCHAR(100),
  deposit_date DATE,
  deposit_bank VARCHAR(100),
  labourer_toilet_installed BOOLEAN DEFAULT false,
  bescom_water_arrangement_verified BOOLEAN DEFAULT false,
  labourers_registered BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  verified_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Post-Construction Refund Table
CREATE TABLE IF NOT EXISTS post_construction_refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id VARCHAR(50) NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
  inspection_date DATE,
  debris_removed BOOLEAN DEFAULT false,
  roads_drains_undamaged BOOLEAN DEFAULT false,
  rainwater_harvesting_verified BOOLEAN DEFAULT false,
  initial_deposit NUMERIC(10, 2) DEFAULT 20000.00,
  deduction_amount NUMERIC(10, 2) DEFAULT 0.00,
  deduction_breakdown JSONB DEFAULT '[]'::jsonb,
  excess_damage_amount NUMERIC(10, 2) DEFAULT 0.00,
  final_refund_amount NUMERIC(10, 2) DEFAULT 20000.00,
  refund_status VARCHAR(40) DEFAULT 'pending' CHECK (refund_status IN ('pending', 'full_refund', 'partial_refund', 'excess_damage_recovery')),
  refund_proof_file_name VARCHAR(255),
  refund_proof_drive_link TEXT, -- Admin only
  refund_transaction_id VARCHAR(100),
  refund_date DATE,
  processed_by VARCHAR(100),
  processed_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_requests_plot ON service_requests(plot_number);
CREATE INDEX IF NOT EXISTS idx_requests_type ON service_requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(request_id);

-- 7. Seed Initial Plots
INSERT INTO plots (plot_number, primary_owner_name, phone, dimensions, area_sq_ft, status, maintenance_cleared_till, membership_paid)
VALUES
  ('12', 'Kavitha Sundaram', '9845012345', '30 x 40 ft', 1200, 'vacant', '2026-12-31', true),
  ('27', 'Rajesh Venkatraman', '9880198801', '30 x 50 ft', 1500, 'under_construction', '2026-12-31', true),
  ('42', 'Anand Kumar Hegde', '9448123456', '40 x 60 ft', 2400, 'vacant', '2026-12-31', true),
  ('58', 'Meenakshi Iyer', '9900223344', '30 x 40 ft', 1200, 'vacant', '2026-12-31', true),
  ('14', 'Dr. Srinivas Murthy', '9844055667', '30 x 40 ft', 1200, 'vacant', '2026-12-31', true),
  ('15', 'Dr. Srinivas Murthy', '9844055667', '30 x 40 ft', 1200, 'vacant', '2026-12-31', true),
  ('73', 'Praveen Chordia', '9740112233', '30 x 50 ft', 1500, 'constructed', '2026-12-31', true),
  ('88', 'Girish Babu', '9632001122', '40 x 60 ft', 2400, 'vacant', '2026-12-31', false)
ON CONFLICT (plot_number) DO NOTHING;
