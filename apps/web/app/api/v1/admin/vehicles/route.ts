import { NextRequest } from 'next/server';
import { prisma, Prisma, VehicleType } from '@servicego/database';
import { apiSuccess, apiCatch } from '@/lib/response';

// GET /api/v1/admin/vehicles?page=1&limit=15&search=&vehicle_type=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 15)));
    const search = searchParams.get('search')?.trim();
    const vehicleType = searchParams.get('vehicle_type')?.trim();

    const where: Prisma.VehicleWhereInput = {};

    if (vehicleType === 'mobil' || vehicleType === 'motor') {
      where.vehicle_type = vehicleType as VehicleType;
    }

    if (search) {
      where.OR = [
        { plate_number: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { owner: { full_name: { contains: search, mode: 'insensitive' } } },
        { owner: { phone: { contains: search, mode: 'insensitive' } } },
        { owner: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              auth_user_id: true,
              full_name: true,
              phone: true,
              email: true,
              avatar_url: true
            }
          },
          bookings: {
            orderBy: { scheduled_at: 'desc' },
            include: {
              booking_services: {
                include: {
                  service: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    const enriched = vehicles.map((v) => {
      const completedBookings = v.bookings.filter((b) => b.status === 'selesai');
      const latestBooking = v.bookings[0] ?? null;
      const latestCompleted = completedBookings[0] ?? null;

      const lastServiceOdo =
        (latestCompleted as Record<string, any> | null)?.odometer_km ??
        (latestBooking as Record<string, any> | null)?.odometer_km ??
        null;

      return {
        id: v.id,
        owner_id: v.owner_id,
        plate_number: v.plate_number,
        brand: v.brand,
        model: v.model,
        year: v.year,
        vehicle_type: v.vehicle_type,
        last_odometer_km: v.last_odometer_km ?? 0,
        last_service_odometer_km: typeof lastServiceOdo === 'number' ? lastServiceOdo : null,
        last_service_date: latestCompleted?.scheduled_at ?? null,
        created_at: v.created_at,
        total_bookings: v.bookings.length,
        completed_bookings: completedBookings.length,
        owner: {
          id: v.owner.id,
          auth_user_id: v.owner.auth_user_id,
          full_name: v.owner.full_name,
          phone: v.owner.phone,
          email: v.owner.email,
          avatar_url: v.owner.avatar_url
        },
        last_booking: latestBooking
          ? {
              id: latestBooking.id,
              status: latestBooking.status,
              scheduled_at: latestBooking.scheduled_at,
              odometer_km:
                typeof (latestBooking as Record<string, any>).odometer_km === 'number'
                  ? (latestBooking as Record<string, any>).odometer_km
                  : null,
              service_summary:
                latestBooking.booking_services.map((bs) => bs.service.name).join(', ') || null
            }
          : null,
        service_history: v.bookings.map((b) => ({
          id: b.id,
          scheduled_at: b.scheduled_at,
          status: b.status,
          odometer_km:
            typeof (b as Record<string, any>).odometer_km === 'number'
              ? (b as Record<string, any>).odometer_km
              : null,
          service_names: b.booking_services.map((bs) => bs.service.name),
          notes: (b as Record<string, any>).notes ?? null
        }))
      };
    });

    return apiSuccess(
      {
        vehicles: enriched,
        meta: {
          total,
          page,
          limit,
          total_pages: Math.max(1, Math.ceil(total / limit))
        }
      },
      'Daftar kendaraan berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data kendaraan');
  }
}