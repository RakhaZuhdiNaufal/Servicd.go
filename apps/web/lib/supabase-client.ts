import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client — anon key only
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});
