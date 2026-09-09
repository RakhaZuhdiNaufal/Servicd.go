import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Supabase anon client (dipakai untuk verifikasi JWT dan client request)
 */
export function getSupabaseAnon(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return anonClient;
}

/**
 * Supabase service role client (dipakai server-side saja untuk admin & operasi tulis sensitif/storage)
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return adminClient;
}
