-- BroLab Beats Store - Database Initialization Script

-- Create extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create development user if it doesn't exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'brolab_user') THEN
      CREATE ROLE brolab_user LOGIN PASSWORD 'brolab_password';
   END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE brolab_beats_dev TO brolab_user;
GRANT ALL ON SCHEMA public TO brolab_user;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO brolab_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO brolab_user;