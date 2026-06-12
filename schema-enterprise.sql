-- Enterprise Biometric Authentication System - Complete Schema
-- Run this in Supabase SQL Editor

-- Organizations Table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users Table (Enhanced)
CREATE TABLE org_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  api_key TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Biometric Modules/Tests Definition
CREATE TABLE biometric_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Configurations Table (Trust Score Configurations)
CREATE TABLE configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Module selection (JSON array of module IDs)
  included_modules JSONB NOT NULL DEFAULT '[]',
  -- Thresholds
  allow_threshold FLOAT DEFAULT 80.0 CHECK (allow_threshold >= 0 AND allow_threshold <= 100),
  challenge_threshold FLOAT DEFAULT 70.0 CHECK (challenge_threshold >= 0 AND challenge_threshold <= 100),
  deny_threshold FLOAT DEFAULT 50.0 CHECK (deny_threshold >= 0 AND deny_threshold <= 100),
  -- URLs for redirects based on decision
  allow_redirect_url TEXT,
  challenge_redirect_url TEXT,
  deny_redirect_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Test Results Table (Enhanced)
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES org_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id UUID NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  raw_data JSONB,
  session_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Authentication Events Table (Enhanced)
CREATE TABLE authentication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES org_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id UUID NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  overall_confidence FLOAT,
  decision TEXT CHECK (decision IN ('allow', 'challenge', 'deny')),
  test_results JSONB,
  redirect_url TEXT,
  ip_address TEXT,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trust Score Summary (Most Recent per User/Org/Config)
CREATE TABLE trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES org_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id UUID NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  confidence_score FLOAT,
  decision TEXT,
  redirect_url TEXT,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id, configuration_id)
);

-- Insert default biometric modules
INSERT INTO biometric_modules (name, description, weight) VALUES
  ('gait_analysis', 'Walking pattern recognition via accelerometer/gyroscope', 0.35),
  ('touch_dynamics', 'Touchscreen pressure and swipe velocity analysis', 0.35),
  ('hand_motion', 'Device holding and micro-movement signature', 0.15),
  ('behavioral_pattern', 'App usage sequence and navigation style', 0.15),
  ('voice_recognition', 'Voice pattern and speech analysis', 0.10),
  ('facial_recognition', 'Face detection and micro-expression analysis', 0.10);

-- Create Indexes
CREATE INDEX idx_org_users_organization ON org_users(organization_id);
CREATE INDEX idx_org_users_email ON org_users(email);
CREATE INDEX idx_org_users_api_key ON org_users(api_key);
CREATE INDEX idx_configurations_organization ON configurations(organization_id);
CREATE INDEX idx_test_results_user ON test_results(user_id);
CREATE INDEX idx_test_results_organization ON test_results(organization_id);
CREATE INDEX idx_test_results_configuration ON test_results(configuration_id);
CREATE INDEX idx_auth_events_user ON authentication_events(user_id);
CREATE INDEX idx_auth_events_organization ON authentication_events(organization_id);
CREATE INDEX idx_trust_scores_user ON trust_scores(user_id);
CREATE INDEX idx_trust_scores_organization ON trust_scores(organization_id);
CREATE INDEX idx_trust_scores_configuration ON trust_scores(configuration_id);

-- Row Level Security Policies
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE authentication_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores DISABLE ROW LEVEL SECURITY;

-- Create Views for Admin Convenience
CREATE VIEW organization_summary AS
SELECT 
  o.id,
  o.name,
  COUNT(DISTINCT u.id) as user_count,
  COUNT(DISTINCT c.id) as configuration_count,
  COUNT(DISTINCT ae.id) as total_authentications,
  MAX(ae.created_at) as last_authentication
FROM organizations o
LEFT JOIN org_users u ON o.id = u.organization_id
LEFT JOIN configurations c ON o.id = c.organization_id
LEFT JOIN authentication_events ae ON o.id = ae.organization_id
GROUP BY o.id, o.name;

CREATE VIEW user_trust_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.organization_id,
  c.id as configuration_id,
  c.name as configuration_name,
  ts.confidence_score,
  ts.decision,
  ts.redirect_url,
  ts.last_verified_at
FROM org_users u
LEFT JOIN configurations c ON u.organization_id = c.organization_id
LEFT JOIN trust_scores ts ON u.id = ts.user_id AND c.id = ts.configuration_id;
