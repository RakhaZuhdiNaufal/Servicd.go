import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { availableSlotsQuerySchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';

const OPERATING_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00'
];

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

    // Rentang tanggal dari 00:00:00 sampai 23:59:59
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

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

    // Hitung per slot jam
    const slots = OPERATING_SLOTS.map((timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const slotTime = new Date(Date.UTC(
        parseInt(date.substring(0, 4)),
        parseInt(date.substring(5, 7)) - 1,
        parseInt(date.substring(8, 10)),
        hours,
        minutes,
        0
      ));

      // Hitung booking yang cocok dengan jam ini (toleransi dalam 1 jam)
      const bookedCount = existingBookings.filter((b) => {
        const bTime = new Date(b.scheduled_at);
        return Math.abs(bTime.getTime() - slotTime.getTime()) < 30 * 60 * 1000;
      }).length;

      const remaining = Math.max(0, capacityPerSlot - bookedCount);

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
