-- Create waitlist_signups table
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(50) DEFAULT 'landing',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_signups(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_signups(created_at);

-- Enable Row Level Security
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: anyone can insert
CREATE POLICY "Allow public insert" ON waitlist_signups
  FOR INSERT WITH CHECK (true);

-- Lock down read access to protect waitlist emails.
-- Reads should be performed from trusted backend contexts only.

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_signups_updated_at BEFORE UPDATE ON waitlist_signups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
