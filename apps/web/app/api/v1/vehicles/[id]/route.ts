import { NextRequest } from 'next/server';
import { prisma, VehicleType } from '@servicego/database';
import { updateVehicleSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id }
    });

    if (!vehicle) {
      return apiError('Kendaraan tidak ditemukan', 404);
    }

    // Cek kepemilikan kendaraan
    if (vehicle.owner_id !== user.profileId && user.role !== 'admin') {
      return apiError('Akses ditolak: Anda bukan pemilik kendaraan ini', 403);
    }

    const body = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    if (parsed.data.plate_number && parsed.data.plate_number.trim() !== vehicle.plate_number) {
      const duplicate = await prisma.vehicle.findFirst({
        where: {
          owner_id: vehicle.owner_id,
          plate_number: {
            equals: parsed.data.plate_number.trim(),
            mode: 'insensitive'
          },
          id: { not: id }
        }
      });
      if (duplicate) {
        return apiError('Nomor plat ini sudah terdaftar pada kendaraan Anda yang lain', 409);
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...parsed.data,
        vehicle_type: parsed.data.vehicle_type ? (parsed.data.vehicle_type as VehicleType) : undefined
      }
    });

    return apiSuccess(updated, 'Data kendaraan berhasil diperbarui');
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui kendaraan');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id }
    });

    if (!vehicle) {
      return apiError('Kendaraan tidak ditemukan', 404);
    }

    // Cek kepemilikan kendaraan
    if (vehicle.owner_id !== user.profileId && user.role !== 'admin') {
      return apiError('Akses ditolak: Anda bukan pemilik kendaraan ini', 403);
    }

    // bookings -> vehicles memakai onDelete: Restrict: riwayat servis tidak boleh ikut hilang.
    const bookingCount = await prisma.booking.count({ where: { vehicle_id: id } });
    if (bookingCount > 0) {
      return apiError(
        `Kendaraan ini punya ${bookingCount} riwayat booking, jadi tidak bisa dihapus agar riwayat servisnya tetap tersimpan.`,
        409
      );
    }

    await prisma.vehicle.delete({
      where: { id }
    });

    return apiSuccess(null, 'Kendaraan berhasil dihapus');
  } catch (error: any) {
    return apiCatch(error, 'Gagal menghapus kendaraan');
  }
}
