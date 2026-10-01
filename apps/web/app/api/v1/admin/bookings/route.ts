import { NextRequest } from 'next/server';
import { prisma, BookingStatus } from '@servicego/database';
import { apiSuccess, apiError } from '@/lib/response';

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

    if (startDateParam || endDateParam) {
      whereClause.scheduled_at = {};
      if (startDateParam) {
        whereClause.scheduled_at.gte = new Date(`${startDateParam}T00:00:00.000Z`);
      }
      if (endDateParam) {
        whereClause.scheduled_at.lte = new Date(`${endDateParam}T23:59:59.999Z`);
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
    return apiError(error.message || 'Gagal mengambil data booking', 500);
  }
}
