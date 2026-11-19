import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { updateServiceSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.service.findUnique({
      where: { id }
    });

    if (!existing) {
      return apiError('Layanan tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const updated = await prisma.service.update({
      where: { id },
      data: parsed.data
    });

    return apiSuccess(updated, 'Layanan berhasil diperbarui');
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui layanan');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.service.findUnique({
      where: { id }
    });

    if (!existing) {
      return apiError('Layanan tidak ditemukan', 404);
    }

    // Soft-delete: set is_active = false sesuai instruksi spesifikasi
    const softDeleted = await prisma.service.update({
      where: { id },
      data: { is_active: false }
    });

    return apiSuccess(softDeleted, 'Layanan berhasil dinonaktifkan (soft-delete)');
  } catch (error: any) {
    return apiCatch(error, 'Gagal menonaktifkan layanan');
  }
}
