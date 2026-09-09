import { NextRequest } from 'next/server';
import { prisma, VehicleType } from '@servicego/database';
import { createVehicleSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan, silakan sinkronkan profil terlebih dahulu', 404);
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { owner_id: user.profileId },
      orderBy: { created_at: 'desc' }
    });

    return apiSuccess(vehicles, 'Daftar kendaraan berhasil diambil');
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengambil data kendaraan', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { plate_number, brand, model, year, vehicle_type, last_odometer_km } = parsed.data;

    // Cek duplikasi plat nomor
    const existing = await prisma.vehicle.findUnique({
      where: { plate_number }
    });

    if (existing) {
      return apiError('Kendaraan dengan nomor plat ini sudah terdaftar', 409);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        owner_id: user.profileId,
        plate_number,
        brand,
        model,
        year,
        vehicle_type: vehicle_type as VehicleType,
        last_odometer_km: last_odometer_km || 0
      }
    });

    return apiSuccess(vehicle, 'Kendaraan berhasil ditambahkan', 201);
  } catch (error: any) {
    return apiError(error.message || 'Gagal menambahkan kendaraan', 500);
  }
}
