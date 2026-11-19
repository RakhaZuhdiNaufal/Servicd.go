import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { OPERATING_SLOTS, todayWIB, wibDayRange } from '@/lib/wib';

export async function GET(request: NextRequest) {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        mechanics: {
          where: { is_active: true },
          select: {
            id: true,
            branch_id: true,
            full_name: true,
            specialty: true,
            is_active: true
          }
        },
        _count: {
          select: {
            mechanics: { where: { is_active: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Hitung available_slots_count hari ini untuk setiap cabang
    // "Hari ini" dihitung dalam WIB, bukan UTC.
    const { start: startOfDay, end: endOfDay } = wibDayRange(todayWIB());

    const todayBookings = await prisma.booking.findMany({
      where: {
        scheduled_at: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: BookingStatus.dibatalkan }
      },
      select: { branch_id: true }
    });

    const enrichedBranches = branches.map((branch) => {
      const bookedToday = todayBookings.filter((b) => b.branch_id === branch.id).length;
      // Perkiraan slot harian (jumlah jam slot operasional * kapasitas per slot)
      const totalDailySlots = OPERATING_SLOTS.length * branch.capacity_per_slot;
      const availableCount = Math.max(0, totalDailySlots - bookedToday);

      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        capacity_per_slot: branch.capacity_per_slot,
        available_slots_count: availableCount,
        mechanics: branch.mechanics
      };
    });

    return apiSuccess(enrichedBranches, 'Daftar cabang bengkel berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data cabang bengkel');
  }
}
