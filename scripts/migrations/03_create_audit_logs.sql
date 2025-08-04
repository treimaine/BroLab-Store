-- ================================
-- MIGRATION: Create audit_logs table
-- Date: 2025-01-22
-- ================================

-- Create audit_logs table for security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_audit_logs_updated_at
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_logs_updated_at();

-- Add RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy: System can insert audit logs (for security tracking)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Policy: Only admins can delete audit logs
-- Note: Since users table doesn't have a role column, we'll restrict delete to service role only
CREATE POLICY "Only service role can delete audit logs" ON audit_logs
  FOR DELETE USING (auth.role() = 'service_role'); 