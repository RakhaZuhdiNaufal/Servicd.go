import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { createBookingSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

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
    return apiError(error.message || 'Gagal mengambil riwayat booking', 500);
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

    const { vehicle_id, service_ids, scheduled_at, complaint_notes, branch_id } = parsed.data;

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

    const estimatedCost = services.reduce(
      (sum, s) => sum + Number(s.price),
      0
    );

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

    // 4. Jalankan Transaksi Database Atomic (Cek bentrok + Insert Booking + Insert BookingService + Insert History)
    const result = await prisma.$transaction(async (tx) => {
      // Cek jumlah booking aktif pada slot waktu tersebut
      const timeWindowStart = new Date(scheduledDate.getTime() - 29 * 60 * 1000);
      const timeWindowEnd = new Date(scheduledDate.getTime() + 29 * 60 * 1000);

      const bookedCount = await tx.booking.count({
        where: {
          branch_id: targetBranchId,
          scheduled_at: {
            gte: timeWindowStart,
            lte: timeWindowEnd
          },
          status: {
            not: BookingStatus.dibatalkan
          }
        }
      });

      if (bookedCount >= branch.capacity_per_slot) {
        throw new Error('Slot waktu yang dipilih sudah penuh, silakan pilih jam atau tanggal lain');
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
          note: 'Booking berhasil dibuat oleh pelanggan'
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
    return apiError(error.message || 'Gagal membuat booking', 400);
  }
}
