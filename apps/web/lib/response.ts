import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export function apiSuccess<T>(data: T, message = 'Berhasil', status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

/** Error yang pesannya memang untuk pengguna. Lempar di dalam transaksi, ditangkap apiCatch. */
export class HttpError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * Penutup semua catch di route API. Pesan internal (Prisma, Supabase, stack) TIDAK dikirim ke klien:
 * dicatat di log server, klien dapat pesan ramah + status yang benar.
 */
export function apiCatch(error: unknown, fallback: string) {
  if (error instanceof HttpError) return apiError(error.message, error.status);
  // request.json() pada body yang bukan JSON
  if (error instanceof SyntaxError) return apiError('Format body tidak valid', 400);
  const code = (error as { code?: string })?.code;
  if (code === 'P2002') return apiError('Data yang sama sudah ada.', 409);
  if (code === 'P2003') return apiError('Data ini masih dipakai data lain, jadi tidak bisa diubah atau dihapus.', 409);
  if (code === 'P2025') return apiError('Data tidak ditemukan.', 404);
  console.error(`[api] ${fallback}:`, error);
  return apiError(fallback, 500);
}

export function apiError(message = 'Terjadi kesalahan', status = 400, data: any = null) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      data,
      message
    },
    { status }
  );
}
