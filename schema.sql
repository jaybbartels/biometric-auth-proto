-- Passive Biometric Auth Prototype - Supabase Schema
-- Run this SQL in your Supabase project's SQL editor

-- Create users table (extends Supabase auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create biometric tests table
CREATE TABLE biometric_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create test results table (stores confidence scores)
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  session_id TEXT
);

-- Create authentication events table (audit log)
CREATE TABLE authentication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_confidence FLOAT,
  decision TEXT CHECK (decision IN ('allow', 'challenge', 'deny')),
  test_results JSONB,
  ip_address TEXT,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default test definitions
INSERT INTO biometric_tests (name, description, weight) VALUES
  ('gait_analysis', 'Walking pattern recognition via accelerometer/gyroscope', 0.35),
  ('touch_dynamics', 'Touchscreen pressure and swipe velocity analysis', 0.35),
  ('hand_motion', 'Device holding and micro-movement signature', 0.15),
  ('behavioral_pattern', 'App usage sequence and navigation style', 0.15);

-- Create indexes for performance
CREATE INDEX idx_test_results_user_id ON test_results(user_id);
CREATE INDEX idx_test_results_created_at ON test_results(created_at);
CREATE INDEX idx_auth_events_user_id ON authentication_events(user_id);
CREATE INDEX idx_auth_events_created_at ON authentication_events(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE authentication_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own data" ON users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own test results" ON test_results 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON test_results 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own auth events" ON authentication_events 
  FOR SELECT USING (auth.uid() = user_id);

-- Public read access to test definitions
ALTER TABLE biometric_tests DISABLE ROW LEVEL SECURITY;

-- Create a view for recent test results (last 10 per user)
CREATE VIEW recent_test_results AS
SELECT DISTINCT ON (user_id, test_name) 
  user_id, test_name, confidence_score, created_at
FROM test_results
ORDER BY user_id, test_name, created_at DESC;
