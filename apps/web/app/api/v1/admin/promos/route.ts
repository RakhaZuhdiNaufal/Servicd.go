import { NextRequest } from 'next/server';
import { prisma, Prisma, PromoDiscountType } from '@servicego/database';
import { createPromoSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { toPromoDTO } from '@/lib/promo';
import { isIsoDate, wibDayRange } from '@/lib/wib';

/** "2026-12-31" (WIB) -> Date. Tanggal mulai dibaca pukul 00.00, berakhir pukul 23.59 WIB. */
function parseWibBoundary(value: string | null | undefined, edge: 'start' | 'end'): Date | null | 'invalid' {
  if (value == null || value === '') return null;
  if (!isIsoDate(value)) return 'invalid';
  return wibDayRange(value)[edge];
}

// GET /api/v1/admin/promos?search=&status=aktif|nonaktif|kedaluwarsa|habis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const statusFilter = searchParams.get('status');

    const where: Prisma.PromoWhereInput = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }

    const promos = await prisma.promo.findMany({
      where,
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      include: { _count: { select: { redemptions: true } } }
    });

    const now = new Date();
    const rows = promos.map((p) => {
      const dto = toPromoDTO(p);
      const expired = !!p.valid_until && p.valid_until < now;
      const notStarted = !!p.valid_from && p.valid_from > now;
      const quotaFull = p.quota != null && p.used_count >= p.quota;
      return {
        ...dto,
        redemption_count: p._count.redemptions,
        // Status ringkas untuk tabel admin, urut dari yang paling menentukan.
        state: !p.is_active
          ? ('nonaktif' as const)
          : expired
            ? ('kedaluwarsa' as const)
            : quotaFull
              ? ('habis' as const)
              : notStarted
                ? ('terjadwal' as const)
                : ('aktif' as const)
      };
    });

    const filtered = statusFilter ? rows.filter((r) => r.state === statusFilter) : rows;

    return apiSuccess(
      {
        promos: filtered,
        meta: {
          total: filtered.length,
          active: rows.filter((r) => r.state === 'aktif').length,
          total_redeemed: rows.reduce((sum, r) => sum + r.redemption_count, 0)
        }
      },
      'Daftar voucher berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data voucher');
  }
}

// POST /api/v1/admin/promos — buat voucher baru.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPromoSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { valid_from, valid_until, discount_type, ...data } = parsed.data;
    const from = parseWibBoundary(valid_from, 'start');
    const until = parseWibBoundary(valid_until, 'end');
    if (from === 'invalid' || until === 'invalid') {
      return apiError('Format tanggal harus YYYY-MM-DD', 422);
    }

    const existing = await prisma.promo.findUnique({ where: { code: data.code } });
    if (existing) {
      return apiError(`Kode ${data.code} sudah dipakai voucher lain`, 409);
    }

    const promo = await prisma.promo.create({
      data: {
        ...data,
        discount_type: discount_type as PromoDiscountType,
        valid_from: from,
        valid_until: until
      }
    });

    return apiSuccess(toPromoDTO(promo), `Voucher ${promo.code} berhasil dibuat`, 201);
  } catch (error: any) {
    return apiCatch(error, 'Gagal membuat voucher');
  }
}
