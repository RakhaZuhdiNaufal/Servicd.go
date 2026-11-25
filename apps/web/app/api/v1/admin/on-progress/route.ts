import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { apiSuccess, apiCatch } from '@/lib/response';
import { todayWIB, wibDayRange } from '@/lib/wib';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const search = searchParams.get('search')?.trim().toLowerCase();

    const todayStr = todayWIB();
    const { start: todayStart, end: todayEnd } = wibDayRange(todayStr);

    const bookingInclude = {
      customer: {
        select: {
          id: true,
          full_name: true,
          phone: true,
          email: true
        }
      },
      vehicle: {
        select: {
          id: true,
          plate_number: true,
          brand: true,
          model: true,
          vehicle_type: true,
          year: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true
        }
      },
      mechanic: {
        select: {
          id: true,
          full_name: true,
          specialty: true
        }
      },
      photos: {
        select: {
          id: true,
          photo_url: true,
          stage: true,
          caption: true,
          uploaded_at: true
        }
      },
      payments: {
        select: {
          id: true,
          amount: true,
          payment_type: true,
          method: true,
          status: true,
          paid_at: true
        }
      },
      booking_services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration_minutes: true,
              price: true
            }
          }
        }
      },
      status_history: {
        orderBy: { changed_at: 'desc' as const },
        take: 10,
        include: {
          changer: {
            select: {
              id: true,
              full_name: true,
              role: true
            }
          }
        }
      }
    };

    const baseWhere: any = {};
    if (branchId) baseWhere.branch_id = branchId;
    if (search) {
      baseWhere.OR = [
        { customer: { full_name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
        { vehicle: { plate_number: { contains: search, mode: 'insensitive' } } },
        { vehicle: { brand: { contains: search, mode: 'insensitive' } } },
        { vehicle: { model: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // 1. Sedang dikerjakan (diproses)
    const inProgressQuery = prisma.booking.findMany({
      where: {
        ...baseWhere,
        status: BookingStatus.diproses
      },
      include: bookingInclude,
      orderBy: { scheduled_at: 'asc' }
    });

    // 2. Siap dikerjakan (dikonfirmasi dan hari jadwalnya sudah tiba)
    const readyTodayQuery = prisma.booking.findMany({
      where: {
        ...baseWhere,
        status: BookingStatus.dikonfirmasi,
        scheduled_at: { lte: todayEnd }
      },
      include: bookingInclude,
      orderBy: { scheduled_at: 'asc' }
    });

    // 3. Selesai hari ini
    const completedTodayQuery = prisma.booking.findMany({
      where: {
        ...baseWhere,
        status: BookingStatus.selesai,
        updated_at: { gte: todayStart, lte: todayEnd }
      },
      include: bookingInclude,
      orderBy: { updated_at: 'desc' }
    });

    // 4. Mekanik aktif untuk penugasan cepat
    const mechanicsQuery = prisma.mechanic.findMany({
      where: {
        is_active: true,
        ...(branchId ? { branch_id: branchId } : {})
      },
      select: {
        id: true,
        full_name: true,
        specialty: true,
        branch_id: true,
        _count: {
          select: {
            bookings: {
              where: { status: BookingStatus.diproses }
            }
          }
        }
      },
      orderBy: { full_name: 'asc' }
    });

    const [inProgress, readyToday, completedToday, mechanics] = await Promise.all([
      inProgressQuery,
      readyTodayQuery,
      completedTodayQuery,
      mechanicsQuery
    ]);

    const activeMechanicsMap = mechanics.map((m) => ({
      id: m.id,
      full_name: m.full_name,
      specialty: m.specialty,
      branch_id: m.branch_id,
      active_jobs_count: m._count.bookings
    }));

    const response = {
      today: todayStr,
      summary: {
        in_progress_count: inProgress.length,
        ready_today_count: readyToday.length,
        total_active_queue: inProgress.length + readyToday.length,
        completed_today_count: completedToday.length,
        active_mechanics_count: activeMechanicsMap.filter((m) => m.active_jobs_count > 0).length,
        available_mechanics_count: activeMechanicsMap.filter((m) => m.active_jobs_count === 0).length
      },
      items: {
        in_progress: inProgress,
        ready_today: readyToday,
        completed_today: completedToday
      },
      mechanics: activeMechanicsMap
    };

    return apiSuccess(response, 'Data pengerjaan on progress berhasil dimuat');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data pengerjaan on progress');
  }
}
