import { createClient } from '@supabase/supabase-js';

// Baca baik dari SUPABASE_URL maupun NEXT_PUBLIC_SUPABASE_URL dengan fallback hardcoded proyek
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ckcaqprcakvuaisdhybx.supabase.co';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrY2FxcHJjYWt2dWFpc2RoeWJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTM2NTM2OCwiZXhwIjoyMTA2OTQxMzY4fQ.F5KqGw2dN480a9XgUTojV2JIqTSG9L_7v2tfIoJ7HE0';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
