import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { isIsoDate, wibDayRange } from '@/lib/wib';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const searchParam = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (statusParam && Object.values(BookingStatus).includes(statusParam as BookingStatus)) {
      whereClause.status = statusParam as BookingStatus;
    }

    // Tanggal filter (YYYY-MM-DD) dibaca sebagai hari kalender WIB, bukan UTC,
    // supaya booking jam 00:00 sampai 06:59 WIB tidak jatuh ke hari sebelumnya.
    if ((startDateParam && !isIsoDate(startDateParam)) || (endDateParam && !isIsoDate(endDateParam))) {
      return apiError('Format tanggal harus YYYY-MM-DD', 422);
    }

    if (startDateParam || endDateParam) {
      whereClause.scheduled_at = {};
      if (startDateParam) {
        whereClause.scheduled_at.gte = wibDayRange(startDateParam).start;
      }
      if (endDateParam) {
        whereClause.scheduled_at.lte = wibDayRange(endDateParam).end;
      }
    }

    if (searchParam) {
      whereClause.OR = [
        {
          customer: {
            full_name: {
              contains: searchParam,
              mode: 'insensitive'
            }
          }
        },
        {
          vehicle: {
            plate_number: {
              contains: searchParam,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where: whereClause }),
      prisma.booking.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              email: true
            }
          },
          vehicle: true,
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
          booking_services: {
            include: {
              service: true
            }
          }
        },
        orderBy: { scheduled_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return apiSuccess(
      {
        bookings,
        meta: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      },
      'Daftar booking admin berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data booking');
  }
}
