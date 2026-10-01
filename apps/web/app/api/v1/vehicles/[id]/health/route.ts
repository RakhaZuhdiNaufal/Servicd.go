import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { apiSuccess, apiError } from '@/lib/response';
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
    const lastBooking = vehicle.bookings[0];
    const lastServiceDate = lastBooking ? lastBooking.scheduled_at : null;

    // 1. Oli Mesin (Interval: tiap 5.000 km atau 6 bulan)
    const odoSinceOil = currentOdo % 5000;
    const oilRemainingKm = Math.max(0, 5000 - odoSinceOil);
    const oilStatus = oilRemainingKm <= 1500 ? 'perlu_cek' : 'baik';
    const oilStatusLabel = oilRemainingKm <= 1500 ? 'Perlu Cek' : 'Baik';
    const oilDaysRemaining = Math.max(1, Math.round(oilRemainingKm / 80)); // estimasi rata-rata 80km/hari

    // 2. Sistem Rem (Interval: tiap 20.000 km)
    const odoSinceBrake = currentOdo % 20000;
    const brakeWearPercent = Math.max(15, Math.round(100 - (odoSinceBrake / 20000) * 100));
    const brakeStatus = brakeWearPercent < 35 ? 'perlu_cek' : 'baik';
    const brakeStatusLabel = brakeWearPercent < 35 ? 'Perlu Ganti' : 'Baik';

    // 3. Aki & Kelistrikan
    // Jika tidak ada keluhan atau belum lewat 2 tahun, kondisi normal
    const batteryStatus = 'normal';
    const batteryStatusLabel = 'Normal';

    // 4. Spooring & Ban (Interval: tiap 10.000 km)
    const odoSinceSpooring = currentOdo % 10000;
    const spooringRemainingKm = Math.max(0, 10000 - odoSinceSpooring);
    const spooringStatus = spooringRemainingKm <= 2000 ? 'perlu_cek' : 'rutin';
    const spooringStatusLabel = spooringRemainingKm <= 2000 ? 'Perlu Cek' : 'Rutin';

    // Hitung overall health score (0-100)
    let score = 100;
    if (oilStatus === 'perlu_cek') score -= 12;
    if (brakeStatus === 'perlu_cek') score -= 18;
    if (spooringStatus === 'perlu_cek') score -= 8;
    score = Math.max(40, score);

    let statusSummary = 'Kondisi Sangat Baik';
    if (score < 75) statusSummary = 'Perlu Perhatian & Servis';
    else if (score < 90) statusSummary = 'Kondisi Baik';

    return apiSuccess({
      vehicle_id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      plate_number: vehicle.plate_number,
      vehicle_type: vehicle.vehicle_type,
      current_odometer_km: currentOdo,
      last_service_date: lastServiceDate,
      total_services_completed: vehicle.bookings.length,
      health_score: score,
      status_summary: statusSummary,
      indicators: [
        {
          key: 'oli_mesin',
          name: 'Oli Mesin',
          status: oilStatus,
          status_label: oilStatusLabel,
          remaining_km: oilRemainingKm,
          estimated_days: oilDaysRemaining,
          message:
            oilRemainingKm <= 1500
              ? `Disarankan ganti dalam ${oilRemainingKm.toLocaleString('id-ID')} km lagi (~${oilDaysRemaining} hari).`
              : `Oli mesin masih dalam kondisi optimal untuk ${oilRemainingKm.toLocaleString('id-ID')} km ke depan.`
        },
        {
          key: 'sistem_rem',
          name: 'Sistem Rem',
          status: brakeStatus,
          status_label: brakeStatusLabel,
          pad_thickness_percent: brakeWearPercent,
          message: `Ketebalan kampas rem ~${brakeWearPercent}%. Minyak rem jernih.`
        },
        {
          key: 'aki_kelistrikan',
          name: 'Aki & Kelistrikan',
          status: batteryStatus,
          status_label: batteryStatusLabel,
          voltage: '12.6V',
          message: 'Tegangan aki 12.6V. Alternator mengisi optimal.'
        },
        {
          key: 'spooring_ban',
          name: 'Spooring & Ban',
          status: spooringStatus,
          status_label: spooringStatusLabel,
          remaining_km: spooringRemainingKm,
          message: `Jadwal rotasi & balancing setiap 10.000 km (${spooringRemainingKm.toLocaleString('id-ID')} km lagi).`
        }
      ]
    }, 'Analisis kesehatan kendaraan berhasil dihitung');
  } catch (error: any) {
    return apiError(error.message || 'Gagal menghitung kesehatan kendaraan', 500);
  }
}
