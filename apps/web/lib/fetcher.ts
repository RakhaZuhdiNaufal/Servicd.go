import { supabase } from '@/lib/supabase-client';

/** Reads the stored session token from Supabase — works client-side */
async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetcher<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>)
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/v1${path}`, { ...init, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}
