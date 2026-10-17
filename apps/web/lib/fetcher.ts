import { supabase } from '@/lib/supabase-client';

/** Reads the stored session token from Supabase: works client-side */
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

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { ...init, headers });
  } catch {
    throw new Error('Tidak bisa terhubung ke server. Cek koneksi internet kamu, lalu coba lagi.');
  }

  // Server kadang membalas HTML (misal error 500 dari Next), jangan tampilkan pesan parser mentah ke pengguna.
  let json: { data?: unknown; message?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server sedang bermasalah (kode ${res.status}). Coba lagi sebentar lagi.`);
  }

  if (!res.ok) {
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}
