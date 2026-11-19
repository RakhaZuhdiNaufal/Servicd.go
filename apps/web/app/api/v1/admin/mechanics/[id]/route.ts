import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { z } from 'zod';

const updateMechanicSchema = z.object({
  branch_id: z.string().uuid().optional(),
  full_name: z.string().min(1).optional(),
  specialty: z.string().min(1).optional(),
  is_active: z.boolean().optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.mechanic.findUnique({
      where: { id }
    });

    if (!existing) {
      return apiError('Mekanik tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updateMechanicSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const updated = await prisma.mechanic.update({
      where: { id },
      data: parsed.data,
      include: { branch: true }
    });

    return apiSuccess(updated, 'Data mekanik berhasil diperbarui');
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui data mekanik');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.mechanic.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });

    if (!existing) {
      return apiError('Mekanik tidak ditemukan', 404);
    }

    // Jika memiliki riwayat booking, lakukan soft delete (nonaktifkan)
    if (existing._count.bookings > 0) {
      const deactivated = await prisma.mechanic.update({
        where: { id },
        data: { is_active: false }
      });
      return apiSuccess(deactivated, 'Mekanik berhasil dinonaktifkan');
    }

    await prisma.mechanic.delete({
      where: { id }
    });

    return apiSuccess(null, 'Mekanik berhasil dihapus');
  } catch (error: any) {
    return apiCatch(error, 'Gagal menghapus mekanik');
  }
}
