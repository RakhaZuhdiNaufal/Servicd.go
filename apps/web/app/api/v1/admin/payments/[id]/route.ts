import { NextRequest } from 'next/server';
import { prisma, PaymentStatus } from '@servicego/database';
import { updatePaymentSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

// PATCH /api/v1/admin/payments/:id — ubah status atau detail pembayaran.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Pembayaran tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { status, paid_at, ...rest } = parsed.data;
    const nextStatus = (status ?? existing.status) as PaymentStatus;

    // paid_at mengikuti status: terisi saat lunas, dikosongkan saat kembali menunggu atau gagal.
    const nextPaidAt =
      nextStatus === PaymentStatus.paid
        ? paid_at
          ? new Date(paid_at)
          : (existing.paid_at ?? new Date())
        : null;

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...rest,
        ...(status ? { status: nextStatus } : {}),
        paid_at: nextPaidAt
      },
      include: {
        booking: {
          select: {
            id: true,
            customer: { select: { full_name: true } },
            vehicle: { select: { plate_number: true } }
          }
        }
      }
    });

    const message =
      status === 'paid'
        ? 'Pembayaran ditandai lunas'
        : status === 'failed'
          ? 'Pembayaran ditandai gagal'
          : status === 'pending'
            ? 'Pembayaran dikembalikan ke status menunggu'
            : 'Data pembayaran diperbarui';

    return apiSuccess(updated, message);
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui pembayaran');
  }
}

/**
 * DELETE /api/v1/admin/payments/:id
 * Hanya untuk salah catat yang belum lunas. Pembayaran yang sudah lunas tidak dihapus
 * supaya rekap pemasukan tidak berubah diam-diam; tandai "gagal" bila memang batal.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Pembayaran tidak ditemukan', 404);
    }

    if (existing.status === PaymentStatus.paid) {
      return apiError(
        'Pembayaran yang sudah lunas tidak bisa dihapus. Ubah statusnya menjadi "gagal" bila transaksinya batal.',
        409
      );
    }

    await prisma.payment.delete({ where: { id } });
    return apiSuccess(null, 'Catatan pembayaran dihapus');
  } catch (error: any) {
    return apiCatch(error, 'Gagal menghapus catatan pembayaran');
  }
}
