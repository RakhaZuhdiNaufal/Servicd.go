import { NextRequest } from 'next/server';
import { prisma, BookingStatus, UserRole } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

export async function GET(request: NextRequest) {
  try {
    const [
      totalCustomers,
      totalVehicles,
      bookingsByStatusRaw,
      completedBookings,
      topServicesRaw,
      recentBookings
    ] = await Promise.all([
      // Total Pelanggan
      prisma.profile.count({
        where: { role: UserRole.customer }
      }),

      // Total Kendaraan
      prisma.vehicle.count(),

      // Booking per Status
      prisma.booking.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      }),

      // Revenue dari booking selesai
      prisma.booking.findMany({
        where: { status: BookingStatus.selesai },
        select: {
          final_cost: true,
          estimated_cost: true
        }
      }),

      // Layanan terlaris (dihitung dari relasi BookingService)
      prisma.bookingService.groupBy({
        by: ['service_id'],
        _count: {
          id: true
        },
        _sum: {
          price_at_booking: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      }),

      // 5 Booking Terkini
      prisma.booking.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          customer: {
            select: { full_name: true, phone: true }
          },
          vehicle: {
            select: { plate_number: true, brand: true, model: true }
          }
        }
      })
    ]);

    // Format Booking per status
    const statusCounts: Record<string, number> = {
      menunggu: 0,
      dikonfirmasi: 0,
      diproses: 0,
      selesai: 0,
      dibatalkan: 0
    };

    bookingsByStatusRaw.forEach((item) => {
      statusCounts[item.status] = item._count.id;
    });

    // Hitung total revenue
    const totalRevenue = completedBookings.reduce((sum, b) => {
      const val = b.final_cost ? Number(b.final_cost) : Number(b.estimated_cost);
      return sum + val;
    }, 0);

    // Ambil detail nama layanan untuk top_services
    const serviceIds = topServicesRaw.map((ts) => ts.service_id);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, price: true }
    });

    const topServices = topServicesRaw.map((ts) => {
      const s = services.find((srv) => srv.id === ts.service_id);
      return {
        service_id: ts.service_id,
        name: s?.name || 'Layanan tidak dikenal',
        total_bookings: ts._count.id,
        total_revenue: ts._sum.price_at_booking ? Number(ts._sum.price_at_booking) : 0
      };
    });

    return apiSuccess(
      {
        total_revenue: totalRevenue,
        total_customers: totalCustomers,
        total_vehicles: totalVehicles,
        bookings_by_status: statusCounts,
        top_services: topServices,
        recent_bookings: recentBookings
      },
      'Ringkasan dashboard admin berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data ringkasan dashboard');
  }
}
