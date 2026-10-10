import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ckcaqprcakvuaisdhybx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrY2FxcHJjYWt2dWFpc2RoeWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNjUzNjgsImV4cCI6MjEwNjk0MTM2OH0.ToG4iiG4Ar1z_2fLn1KfxwZFaD-8mCpRaZDK0S6OU7I';

export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const createClient = () => supabase;
