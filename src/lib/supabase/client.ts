import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ckcaqprcakvuaishdybx.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrY2FxcHJjYWt2dWFpc2RoeWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNjUzNjgsImV4cCI6MjEwNjk0MTM2OH0.ToG4iiG4Ar1z_2fLn1KfxwZFaD-8mCpRaZDK0S6OU7I';

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const createClient = () => supabase;
