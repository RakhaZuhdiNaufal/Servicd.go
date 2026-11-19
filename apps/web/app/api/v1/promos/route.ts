import { prisma } from '@servicego/database';
import { apiSuccess, apiCatch } from '@/lib/response';
import { toPromoDTO } from '@/lib/promo';

/**
 * GET /api/v1/promos — voucher yang masih bisa dipakai pelanggan.
 * Sumbernya tabel `promos` (dikelola admin di /admin/voucher); aturan potongannya
 * ada di packages/shared/src/promos.ts supaya sama dengan validasi POST /bookings.
 */
export async function GET() {
  try {
    const now = new Date();
    const promos = await prisma.promo.findMany({
      where: {
        is_active: true,
        AND: [
          { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
          { OR: [{ valid_until: null }, { valid_until: { gte: now } }] }
        ]
      },
      orderBy: [{ discount_value: 'desc' }, { code: 'asc' }]
    });

    // Voucher yang kuotanya sudah habis tidak ditawarkan lagi ke pelanggan.
    const available = promos.filter((p) => p.quota == null || p.used_count < p.quota);

    return apiSuccess(available.map(toPromoDTO), 'Daftar paket promo berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data promo');
  }
}
