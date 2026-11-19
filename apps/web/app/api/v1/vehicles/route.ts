import { NextRequest } from 'next/server';
import { prisma, VehicleType } from '@servicego/database';
import { createVehicleSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (!user.profileId && !user.authId)) {
      return apiError('Profil pengguna tidak ditemukan, silakan login kembali', 401);
    }

    let profileId = user.profileId;
    if (!profileId && user.authId) {
      const p = await prisma.profile.upsert({
        where: { auth_user_id: user.authId },
        update: {},
        create: {
          auth_user_id: user.authId,
          full_name: user.email.split('@')[0] || 'Pelanggan',
          phone: '',
          email: user.email,
          role: 'customer'
        }
      });
      profileId = p.id;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { owner_id: profileId },
      include: {
        bookings: {
          where: { status: 'selesai' },
          orderBy: { scheduled_at: 'desc' },
          take: 1,
          select: { scheduled_at: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const enriched = vehicles.map((v) => ({
      id: v.id,
      plate_number: v.plate_number,
      brand: v.brand,
      model: v.model,
      year: v.year,
      vehicle_type: v.vehicle_type,
      last_odometer_km: v.last_odometer_km,
      last_service_date: v.bookings[0]?.scheduled_at ?? null
    }));

    return apiSuccess(enriched, 'Daftar kendaraan berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data kendaraan');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (!user.profileId && !user.authId)) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    let profileId = user.profileId;
    if (!profileId && user.authId) {
      const p = await prisma.profile.upsert({
        where: { auth_user_id: user.authId },
        update: {},
        create: {
          auth_user_id: user.authId,
          full_name: user.email.split('@')[0] || 'Pelanggan',
          phone: '',
          email: user.email,
          role: 'customer'
        }
      });
      profileId = p.id;
    }

    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { plate_number, brand, model, year, vehicle_type, last_odometer_km } = parsed.data;

    // Cek duplikasi plat nomor khusus untuk akun pemilik yang sama
    const existing = await prisma.vehicle.findFirst({
      where: {
        owner_id: profileId,
        plate_number: {
          equals: plate_number.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return apiError('Kendaraan dengan nomor plat ini sudah terdaftar di akun Anda', 409);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        owner_id: profileId,
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
    return apiCatch(error, 'Gagal menambahkan kendaraan');
  }
}
