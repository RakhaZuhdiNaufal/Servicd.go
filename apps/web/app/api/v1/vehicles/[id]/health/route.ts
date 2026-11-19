import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user || (!user.profileId && !user.authId)) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: BookingStatus.selesai },
          include: {
            booking_services: {
              include: { service: true }
            }
          },
          orderBy: { scheduled_at: 'desc' }
        }
      }
    });

    if (!vehicle) {
      return apiError('Kendaraan tidak ditemukan', 404);
    }

    // Cek otorisasi pemilik
    if (user.role !== 'admin' && vehicle.owner_id !== user.profileId) {
      return apiError('Akses ditolak: Anda bukan pemilik kendaraan ini', 403);
    }

    const currentOdo = vehicle.last_odometer_km || 0;
    const completed = vehicle.bookings; // status selesai, terbaru dulu
    const lastServiceDate = completed[0]?.scheduled_at ?? null;
    const now = new Date();

    // Hanya fakta dari riwayat servis ServiceGo. Tidak ada angka sensor (tegangan aki, tebal kampas)
    // karena aplikasi tidak pernah mengukurnya. Interval waktu mengikuti panduan servis berkala di PLAN.md #3.
    const ITEMS: Array<{ key: string; name: string; keywords: RegExp; interval_months: number }> = [
      { key: 'oli_mesin', name: 'Oli mesin', keywords: /oli|servis berkala|tune.?up/i, interval_months: 6 },
      { key: 'sistem_rem', name: 'Sistem rem', keywords: /rem|brake/i, interval_months: 12 },
      { key: 'spooring_ban', name: 'Spooring & balancing', keywords: /spooring|balanc|ban/i, interval_months: 6 },
      { key: 'ac', name: 'AC', keywords: /\bac\b|freon|kabin/i, interval_months: 12 }
    ];

    const monthsBetween = (from: Date, to: Date) =>
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) - (to.getDate() < from.getDate() ? 1 : 0);

    const indicators = ITEMS.map((item) => {
      const last = completed.find((b) => b.booking_services.some((bs) => item.keywords.test(bs.service.name)));
      if (!last) {
        return {
          key: item.key,
          name: item.name,
          status: 'belum_ada_data' as const,
          status_label: 'Belum ada data',
          last_done_at: null,
          months_since: null,
          interval_months: item.interval_months,
          message: `Belum ada catatan ${item.name.toLowerCase()} di ServiceGo untuk kendaraan ini.`
        };
      }
      const doneAt = new Date(last.scheduled_at);
      const months = Math.max(0, monthsBetween(doneAt, now));
      const due = months >= item.interval_months;
      return {
        key: item.key,
        name: item.name,
        status: due ? ('perlu_cek' as const) : ('baik' as const),
        status_label: due ? 'Waktunya dicek' : 'Masih dalam jadwal',
        last_done_at: doneAt.toISOString(),
        months_since: months,
        interval_months: item.interval_months,
        message: due
          ? `Terakhir dikerjakan ${months} bulan lalu. Jadwal anjuran tiap ${item.interval_months} bulan.`
          : `Terakhir dikerjakan ${months === 0 ? 'bulan ini' : `${months} bulan lalu`}. Jadwal anjuran tiap ${item.interval_months} bulan.`
      };
    });

    return apiSuccess({
      vehicle_id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      plate_number: vehicle.plate_number,
      vehicle_type: vehicle.vehicle_type,
      current_odometer_km: currentOdo,
      last_service_date: lastServiceDate,
      total_services_completed: completed.length,
      indicators
    }, 'Ringkasan perawatan kendaraan berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal menghitung kesehatan kendaraan');
  }
}
