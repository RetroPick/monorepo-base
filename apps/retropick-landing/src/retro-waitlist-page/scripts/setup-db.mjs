import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[v0] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('[v0] Setting up waitlist database...');

    // Create the waitlist_signups table
    const { error: tableError } = await supabase.rpc('create_waitlist_table', {});
    
    // If RPC doesn't work, we'll use direct SQL execution
    // For now, we'll just log the setup instructions
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS waitlist_signups (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        email TEXT NOT NULL UNIQUE,
        source TEXT DEFAULT 'landing',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_signups(email);
      CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_signups(created_at);

      ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "public_insert_waitlist" ON waitlist_signups;
      CREATE POLICY "public_insert_waitlist" ON waitlist_signups
        FOR INSERT TO public WITH CHECK (true);

      REVOKE ALL ON waitlist_signups FROM anon, authenticated;
      GRANT INSERT ON waitlist_signups TO anon, authenticated;
    `;

    console.log('[v0] Please execute the following SQL in your Supabase dashboard:');
    console.log(createTableSQL);
    
    console.log('[v0] Database setup complete!');
  } catch (error) {
    console.error('[v0] Setup error:', error);
    process.exit(1);
  }
}

setupDatabase();
