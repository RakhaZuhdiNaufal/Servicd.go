import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { availableSlotsQuerySchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';
import { OPERATING_SLOTS, wibDateTime, wibDayRange } from '@/lib/wib';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const branchIdParam = searchParams.get('branch_id');

    const parsed = availableSlotsQuerySchema.safeParse({
      date: dateParam,
      branch_id: branchIdParam || undefined
    });

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Query parameter tidak valid', 422);
    }

    const { date, branch_id } = parsed.data;

    // Ambil kapasitas slot cabang jika branch_id diberikan, atau ambil default cabang pertama
    let capacityPerSlot = 2;
    if (branch_id) {
      const branch = await prisma.branch.findUnique({
        where: { id: branch_id }
      });
      if (branch) {
        capacityPerSlot = branch.capacity_per_slot;
      }
    } else {
      const defaultBranch = await prisma.branch.findFirst();
      if (defaultBranch) {
        capacityPerSlot = defaultBranch.capacity_per_slot;
      }
    }

    // Rentang satu hari penuh dalam WIB (bukan UTC), sama dengan zona jam slot.
    const { start: startOfDay, end: endOfDay } = wibDayRange(date);

    // Cari booking aktif (bukan dibatalkan) pada hari tersebut
    const existingBookings = await prisma.booking.findMany({
      where: {
        scheduled_at: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          not: 'dibatalkan'
        },
        ...(branch_id ? { branch_id } : {})
      },
      select: {
        scheduled_at: true
      }
    });

    const durationParam = parseInt(searchParams.get('duration_minutes') || '60', 10);
    const durationMinutes = isNaN(durationParam) || durationParam < 15 ? 60 : durationParam;
    const halfDurationMs = Math.round((durationMinutes / 2) * 60 * 1000);

    // Hitung per slot jam
    const slots = OPERATING_SLOTS.map((timeStr) => {
      // Jam slot adalah jam WIB, sama dengan yang dikirim form booking (offset +07:00).
      const slotTime = wibDateTime(date, timeStr);
      const isPast = slotTime.getTime() <= Date.now();

      // Hitung booking yang overlap dengan window slot ini: slotTime ± (duration / 2)
      const bookedCount = existingBookings.filter((b) => {
        const bTime = new Date(b.scheduled_at);
        return Math.abs(bTime.getTime() - slotTime.getTime()) < halfDurationMs;
      }).length;

      const remaining = isPast ? 0 : Math.max(0, capacityPerSlot - bookedCount);

      return {
        time: timeStr,
        scheduled_at: slotTime.toISOString(),
        capacity: capacityPerSlot,
        booked: bookedCount,
        available: remaining,
        is_available: remaining > 0
      };
    });

    return apiSuccess({
      date,
      branch_id: branch_id || null,
      capacity_per_slot: capacityPerSlot,
      slots
    }, 'Informasi slot waktu tersedia berhasil diambil');
  } catch (error: any) {
    return apiError(error.message || 'Gagal memeriksa slot waktu', 500);
  }
}
