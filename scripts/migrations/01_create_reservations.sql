-- Migration: Create reservations table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mixing', 'mastering', 'recording', 'custom_beat', 'consultation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  details JSONB NOT NULL DEFAULT '{}',
  preferred_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(preferred_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own reservations
CREATE POLICY "Users can view own reservations" ON reservations
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Allow users to create reservations
CREATE POLICY "Users can create reservations" ON reservations
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Allow users to update their own reservations
CREATE POLICY "Users can update own reservations" ON reservations
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);