import { NextRequest } from 'next/server';
import { prisma, PromoDiscountType } from '@servicego/database';
import { updatePromoSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { toPromoDTO } from '@/lib/promo';
import { isIsoDate, wibDayRange } from '@/lib/wib';

function parseWibBoundary(value: string | null | undefined, edge: 'start' | 'end'): Date | null | 'invalid' {
  if (value == null || value === '') return null;
  if (!isIsoDate(value)) return 'invalid';
  return wibDayRange(value)[edge];
}

// GET /api/v1/admin/promos/:id — detail voucher + siapa saja yang memakainya.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const promo = await prisma.promo.findUnique({
      where: { id },
      include: {
        redemptions: {
          orderBy: { created_at: 'desc' },
          take: 50,
          include: {
            customer: { select: { id: true, full_name: true } },
            booking: { select: { id: true, scheduled_at: true, status: true } }
          }
        }
      }
    });

    if (!promo) {
      return apiError('Voucher tidak ditemukan', 404);
    }

    const { redemptions, ...row } = promo;
    return apiSuccess(
      {
        ...toPromoDTO(row),
        redemptions: redemptions.map((r) => ({
          id: r.id,
          discount_amount: Number(r.discount_amount),
          created_at: r.created_at,
          customer: r.customer,
          booking: r.booking
        }))
      },
      'Detail voucher berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil detail voucher');
  }
}

// PUT /api/v1/admin/promos/:id — ubah voucher.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.promo.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Voucher tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updatePromoSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { valid_from, valid_until, discount_type, code, quota, ...data } = parsed.data;

    const from = 'valid_from' in parsed.data ? parseWibBoundary(valid_from, 'start') : undefined;
    const until = 'valid_until' in parsed.data ? parseWibBoundary(valid_until, 'end') : undefined;
    if (from === 'invalid' || until === 'invalid') {
      return apiError('Format tanggal harus YYYY-MM-DD', 422);
    }

    if (code && code !== existing.code) {
      const duplicate = await prisma.promo.findUnique({ where: { code } });
      if (duplicate) {
        return apiError(`Kode ${code} sudah dipakai voucher lain`, 409);
      }
    }

    // Kuota tidak boleh diturunkan di bawah jumlah yang sudah terpakai: angka "sisa kuota"
    // akan jadi negatif dan pelanggan terlanjur memakainya.
    if (quota != null && quota < existing.used_count) {
      return apiError(
        `Voucher ini sudah dipakai ${existing.used_count}x, jadi kuotanya tidak bisa diturunkan ke ${quota}.`,
        422
      );
    }

    const promo = await prisma.promo.update({
      where: { id },
      data: {
        ...data,
        ...(code ? { code } : {}),
        ...(quota !== undefined ? { quota } : {}),
        ...(discount_type ? { discount_type: discount_type as PromoDiscountType } : {}),
        ...(from !== undefined ? { valid_from: from } : {}),
        ...(until !== undefined ? { valid_until: until } : {})
      }
    });

    return apiSuccess(toPromoDTO(promo), `Voucher ${promo.code} berhasil diperbarui`);
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui voucher');
  }
}

/**
 * DELETE /api/v1/admin/promos/:id
 * Voucher yang sudah pernah dipakai hanya dinonaktifkan, supaya riwayat diskon pada
 * booking lama tetap bisa ditelusuri.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.promo.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } }
    });

    if (!existing) {
      return apiError('Voucher tidak ditemukan', 404);
    }

    if (existing._count.redemptions > 0) {
      const deactivated = await prisma.promo.update({ where: { id }, data: { is_active: false } });
      return apiSuccess(
        toPromoDTO(deactivated),
        `Voucher ${existing.code} dinonaktifkan karena sudah dipakai ${existing._count.redemptions}x`
      );
    }

    await prisma.promo.delete({ where: { id } });
    return apiSuccess(null, `Voucher ${existing.code} berhasil dihapus`);
  } catch (error: any) {
    return apiCatch(error, 'Gagal menghapus voucher');
  }
}
