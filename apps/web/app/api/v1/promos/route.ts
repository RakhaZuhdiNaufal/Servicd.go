import { PROMOS, todayInWIB } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

// Daftar promo ada di packages/shared/src/promos.ts supaya sama persis dengan validasi kode promo di POST /bookings.
export async function GET() {
  try {
    const today = todayInWIB();
    const promos = PROMOS.filter((p) => p.is_active && p.valid_until >= today);
    return apiSuccess(promos, 'Daftar paket promo berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data promo');
  }
}
