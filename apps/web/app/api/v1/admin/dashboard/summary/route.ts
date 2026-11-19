import { NextRequest } from 'next/server';
import { prisma, BookingStatus, UserRole } from '@servicego/database';
import { apiSuccess, apiCatch } from '@/lib/response';
import { getStockAlerts } from '@/lib/stock-alerts';
import { todayWIB, toWIBParts, wibDayRange } from '@/lib/wib';

/** Panjang grafik tren di dashboard (hari kalender WIB, termasuk hari ini). */
const TREND_DAYS = 14;

interface TrendRow {
  day: string;
  bookings: number;
  completed: number;
  revenue: number;
}

/** Daftar tanggal WIB (YYYY-MM-DD) dari `days` hari lalu sampai hari ini. */
function wibDaySeries(days: number, now = new Date()): string[] {
  const today = todayWIB(now);
  const base = new Date(`${today}T00:00:00.000Z`);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function GET(_request: NextRequest) {
  try {
    const days = wibDaySeries(TREND_DAYS);
    const trendStart = wibDayRange(days[0]).start;
    const trendEnd = wibDayRange(days[days.length - 1]).end;
    const monthStart = wibDayRange(`${todayWIB().slice(0, 7)}-01`).start;

    const [
      totalCustomers,
      totalVehicles,
      bookingsByStatusRaw,
      revenueRows,
      bookingsThisMonth,
      topServicesRaw,
      recentBookings,
      trendRaw,
      stockAlerts
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

      // Revenue booking selesai: dijumlahkan di database (bukan ditarik semua ke memori),
      // memakai final_cost bila ada dan estimated_cost bila belum diisi.
      prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(COALESCE(final_cost, estimated_cost)), 0)::float8 AS total
        FROM bookings
        WHERE status = 'selesai'
      `,

      // Booking yang dijadwalkan bulan berjalan (kalender WIB)
      prisma.booking.count({
        where: { scheduled_at: { gte: monthStart } }
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
      }),

      // Bahan grafik tren: hanya kolom yang dipakai, dan hanya rentang 14 hari
      // (kapasitas bengkel membatasi jumlahnya, jadi aman dikelompokkan di aplikasi).
      // Pengelompokan per hari dilakukan dengan kalender WIB, bukan UTC, supaya jadwal
      // pukul 00.00-06.59 WIB tidak jatuh ke hari sebelumnya.
      prisma.booking.findMany({
        where: { scheduled_at: { gte: trendStart, lte: trendEnd } },
        select: { scheduled_at: true, status: true, final_cost: true, estimated_cost: true }
      }),

      // Peringatan stok: layanan yang barangnya habis/menipis dan perlu dinonaktifkan.
      getStockAlerts()
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

    const totalRevenue = Number(revenueRows[0]?.total ?? 0);

    // Hari tanpa booking tetap muncul sebagai nol, supaya garis tren tidak bolong.
    const byDay = new Map<string, TrendRow>(days.map((day) => [day, { day, bookings: 0, completed: 0, revenue: 0 }]));
    for (const b of trendRaw) {
      const row = byDay.get(toWIBParts(b.scheduled_at).date);
      if (!row) continue;
      row.bookings += 1;
      if (b.status === BookingStatus.selesai) {
        row.completed += 1;
        row.revenue += Number(b.final_cost ?? b.estimated_cost);
      }
    }
    const trend: TrendRow[] = days.map((day) => byDay.get(day)!);

    const trendRevenue = trend.reduce((sum, d) => sum + d.revenue, 0);
    const trendBookings = trend.reduce((sum, d) => sum + d.bookings, 0);

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
        bookings_this_month: bookingsThisMonth,
        bookings_by_status: statusCounts,
        top_services: topServices,
        recent_bookings: recentBookings,
        stock_alerts: stockAlerts,
        trend: {
          days: TREND_DAYS,
          start: days[0],
          end: days[days.length - 1],
          total_revenue: trendRevenue,
          total_bookings: trendBookings,
          rows: trend
        }
      },
      'Ringkasan dashboard admin berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data ringkasan dashboard');
  }
}
