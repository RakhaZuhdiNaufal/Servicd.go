import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { createBookingSchema, findActivePromo, promoDiscount } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch, HttpError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';
import { OPERATING_SLOTS, toWIBParts, wibDayRange } from '@/lib/wib';
import { bookingDuration, remainingCapacity } from '@/lib/capacity';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const bookings = await prisma.booking.findMany({
      where: { customer_id: user.profileId },
      include: {
        vehicle: true,
        booking_services: {
          include: {
            service: true
          }
        },
        mechanic: {
          select: {
            id: true,
            full_name: true,
            specialty: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return apiSuccess(bookings, 'Riwayat booking berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil riwayat booking');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.profileId) {
      return apiError('Profil pengguna tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { vehicle_id, service_ids, scheduled_at, complaint_notes, branch_id, promo_code } = parsed.data;

    // 1. Verifikasi kepemilikan kendaraan
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle_id }
    });

    if (!vehicle || vehicle.owner_id !== user.profileId) {
      return apiError('Kendaraan tidak ditemukan atau bukan milik Anda', 403);
    }

    // 2. Verifikasi layanan yang dipilih & hitung estimasi biaya
    const services = await prisma.service.findMany({
      where: {
        id: { in: service_ids },
        is_active: true
      }
    });

    if (services.length !== service_ids.length) {
      return apiError('Satu atau lebih layanan tidak valid atau tidak aktif', 400);
    }

    const subtotal = services.reduce(
      (sum, s) => sum + Number(s.price),
      0
    );

    // Kode promo (opsional): diskon persen dipotong dari estimasi biaya layanan.
    let promoNote: string | null = null;
    let estimatedCost = subtotal;
    if (promo_code && promo_code.trim()) {
      const promo = findActivePromo(promo_code);
      if (!promo) {
        return apiError('Kode promo tidak dikenal atau sudah tidak berlaku', 422);
      }
      const discount = promoDiscount(promo, subtotal);
      estimatedCost = subtotal - discount;
      promoNote = `Kode promo ${promo.code}: diskon ${promo.discount_percent}% (Rp ${discount.toLocaleString('id-ID')}) dari estimasi Rp ${subtotal.toLocaleString('id-ID')}`;
    }

    // 3. Tentukan cabang
    let targetBranchId = branch_id;
    if (!targetBranchId) {
      const defaultBranch = await prisma.branch.findFirst();
      if (!defaultBranch) {
        return apiError('Belum ada cabang bengkel yang tersedia', 400);
      }
      targetBranchId = defaultBranch.id;
    }

    const branch = await prisma.branch.findUnique({
      where: { id: targetBranchId }
    });

    if (!branch) {
      return apiError('Cabang tidak ditemukan', 404);
    }

    const scheduledDate = new Date(scheduled_at);

    // Jadwal harus jatuh tepat di salah satu jam slot operasional (WIB) dan belum lewat.
    const { date: wibDate, time: wibTime } = toWIBParts(scheduledDate);
    if (!OPERATING_SLOTS.includes(wibTime)) {
      return apiError(`Jam ${wibTime} WIB bukan jam slot bengkel. Pilih salah satu: ${OPERATING_SLOTS.join(', ')}`, 422);
    }
    if (scheduledDate.getTime() <= Date.now()) {
      return apiError('Jadwal yang dipilih sudah lewat. Pilih tanggal atau jam lain.', 422);
    }

    // Durasi booking baru = total durasi layanan (rumus sama dengan available-slots).
    const durationMinutes = bookingDuration(services.map((s) => s.duration_minutes));

    // 4. Jalankan Transaksi Database Atomic (Cek bentrok + Insert Booking + Insert BookingService + Insert History)
    const result = await prisma.$transaction(async (tx) => {
      // Kunci per cabang + tanggal WIB. Tanpa ini, dua request bersamaan sama-sama melihat
      // "masih ada kapasitas" (READ COMMITTED) lalu keduanya insert = overbooking.
      // Lock dilepas otomatis saat transaksi commit/rollback. ponytail: kunci satu hari per cabang
      // (bukan per slot) karena window durasi bisa melintasi slot; cukup untuk volume bengkel.
      // $executeRaw (bukan $queryRaw): pg_advisory_xact_lock mengembalikan void yang tidak bisa dibaca Prisma.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking:${targetBranchId}:${wibDate}`}))`;

      // Puncak booking yang berjalan bersamaan selama booking baru, dari booking aktif hari itu.
      const { start: dayStart, end: dayEnd } = wibDayRange(wibDate);
      const sameDay = await tx.booking.findMany({
        where: {
          branch_id: targetBranchId,
          scheduled_at: { gte: dayStart, lte: dayEnd },
          status: { not: BookingStatus.dibatalkan }
        },
        select: {
          scheduled_at: true,
          booking_services: { select: { service: { select: { duration_minutes: true } } } }
        }
      });
      const intervals = sameDay.map((b) => ({
        start: b.scheduled_at,
        durationMinutes: bookingDuration(b.booking_services.map((bs) => bs.service.duration_minutes))
      }));

      if (remainingCapacity(intervals, scheduledDate, durationMinutes, branch.capacity_per_slot) === 0) {
        throw new HttpError('Slot waktu yang dipilih sudah penuh, silakan pilih jam atau tanggal lain', 409);
      }

      // Buat row booking
      const newBooking = await tx.booking.create({
        data: {
          customer_id: user.profileId,
          vehicle_id,
          branch_id: targetBranchId,
          scheduled_at: scheduledDate,
          status: BookingStatus.menunggu,
          complaint_notes: complaint_notes ?? null,
          estimated_cost: estimatedCost
        }
      });

      // Insert junction BookingService
      await tx.bookingService.createMany({
        data: services.map((s) => ({
          booking_id: newBooking.id,
          service_id: s.id,
          price_at_booking: s.price
        }))
      });

      // Insert riwayat status awal
      await tx.bookingStatusHistory.create({
        data: {
          booking_id: newBooking.id,
          status: BookingStatus.menunggu,
          changed_by: user.profileId,
          note: promoNote
            ? `Booking berhasil dibuat oleh pelanggan. ${promoNote}`
            : 'Booking berhasil dibuat oleh pelanggan'
        }
      });

      return newBooking;
    });

    // Ambil data lengkap untuk response
    const completeBooking = await prisma.booking.findUnique({
      where: { id: result.id },
      include: {
        vehicle: true,
        booking_services: {
          include: {
            service: true
          }
        },
        status_history: true
      }
    });

    return apiSuccess(completeBooking, 'Booking berhasil dibuat', 201);
  } catch (error: any) {
    return apiCatch(error, 'Gagal membuat booking');
  }
}
