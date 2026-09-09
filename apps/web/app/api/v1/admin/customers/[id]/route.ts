import { NextRequest } from 'next/server';
import { prisma, UserRole } from '@servicego/database';
import { updateCustomerSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.profile.findFirst({
      where: { id, role: UserRole.customer }
    });

    if (!existing) {
      return apiError('Pelanggan tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const updated = await prisma.profile.update({
      where: { id },
      data: parsed.data
    });

    return apiSuccess(updated, 'Data pelanggan berhasil diperbarui');
  } catch (error: any) {
    return apiError(error.message || 'Gagal memperbarui data pelanggan', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.profile.findFirst({
      where: { id, role: UserRole.customer }
    });

    if (!existing) {
      return apiError('Pelanggan tidak ditemukan', 404);
    }

    await prisma.profile.delete({
      where: { id }
    });

    return apiSuccess(null, 'Pelanggan berhasil dihapus');
  } catch (error: any) {
    return apiError(error.message || 'Gagal menghapus data pelanggan', 500);
  }
}
