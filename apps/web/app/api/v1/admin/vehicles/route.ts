import { NextRequest } from 'next/server';
import { prisma, VehicleType } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchParam = searchParams.get('search');
    const vehicleTypeParam = searchParams.get('vehicle_type');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (vehicleTypeParam && (vehicleTypeParam === 'mobil' || vehicleTypeParam === 'motor')) {
      whereClause.vehicle_type = vehicleTypeParam as VehicleType;
    }

    if (searchParam) {
      whereClause.OR = [
        { plate_number: { contains: searchParam, mode: 'insensitive' } },
        { brand: { contains: searchParam, mode: 'insensitive' } },
        { model: { contains: searchParam, mode: 'insensitive' } },
        {
          owner: {
            full_name: { contains: searchParam, mode: 'insensitive' }
          }
        },
        {
          owner: {
            phone: { contains: searchParam, mode: 'insensitive' }
          }
        }
      ];
    }

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where: whereClause }),
      prisma.vehicle.findMany({
        where: whereClause,
        include: {
          owner: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              email: true,
              avatar_url: true
            }
          },
          _count: {
            select: {
              bookings: true
            }
          },
          bookings: {
            orderBy: { scheduled_at: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              scheduled_at: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    const formattedVehicles = vehicles.map((v) => ({
      id: v.id,
      owner_id: v.owner_id,
      plate_number: v.plate_number,
      brand: v.brand,
      model: v.model,
      year: v.year,
      vehicle_type: v.vehicle_type,
      last_odometer_km: v.last_odometer_km,
      created_at: v.created_at,
      owner: v.owner,
      total_bookings: v._count.bookings,
      last_booking: v.bookings[0] || null
    }));

    return apiSuccess({
      vehicles: formattedVehicles,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      }
    }, 'Daftar semua kendaraan pelanggan berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data kendaraan');
  }
}
