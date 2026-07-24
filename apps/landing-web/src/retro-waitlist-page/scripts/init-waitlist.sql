-- Create waitlist_signups table
CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist_signups(created_at);

-- Enable Row Level Security
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Public insert policy (PostgreSQL has no CREATE POLICY IF NOT EXISTS on many versions)
DROP POLICY IF EXISTS "public_insert_waitlist" ON public.waitlist_signups;
CREATE POLICY "public_insert_waitlist" ON public.waitlist_signups
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_waitlist_signups_updated_at ON public.waitlist_signups;
CREATE TRIGGER update_waitlist_signups_updated_at
  BEFORE UPDATE ON public.waitlist_signups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Restrict table access: public can only insert through RLS policy.
-- No public read grants to protect waitlist emails.
REVOKE ALL ON public.waitlist_signups FROM anon, authenticated;
GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
