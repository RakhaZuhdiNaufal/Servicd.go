import { NextRequest } from 'next/server';
import { prisma, Prisma, PaymentStatus, PaymentType, PaymentMethod } from '@servicego/database';
import { createPaymentSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';
import { isIsoDate, toWIBParts, wibDayRange } from '@/lib/wib';

const PAGE_LIMIT_MAX = 100;

function isStatus(v: string | null): v is PaymentStatus {
  return v === 'pending' || v === 'paid' || v === 'failed';
}

function isType(v: string | null): v is PaymentType {
  return v === 'dp' || v === 'pelunasan';
}

/**
 * GET /api/v1/admin/payments
 * Daftar pembayaran + rekap pemasukan. Filter: status, jenis, rentang tanggal (WIB),
 * pencarian (nama pelanggan / plat / kode booking), dan booking_id tertentu.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');
    const bookingId = searchParams.get('booking_id');
    const search = searchParams.get('search')?.trim();
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(PAGE_LIMIT_MAX, parseInt(searchParams.get('limit') || '20', 10)));

    if ((startDate && !isIsoDate(startDate)) || (endDate && !isIsoDate(endDate))) {
      return apiError('Format tanggal harus YYYY-MM-DD', 422);
    }

    const where: Prisma.PaymentWhereInput = {};
    if (isStatus(statusParam)) where.status = statusParam;
    if (isType(typeParam)) where.payment_type = typeParam;
    if (bookingId) where.booking_id = bookingId;

    // Rentang tanggal memakai waktu pencatatan, supaya pembayaran berstatus menunggu
    // (yang belum punya paid_at) tetap muncul di laporan hariannya.
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = wibDayRange(startDate).start;
      if (endDate) where.created_at.lte = wibDayRange(endDate).end;
    }

    if (search) {
      where.booking = {
        OR: [
          { customer: { full_name: { contains: search, mode: 'insensitive' } } },
          { vehicle: { plate_number: { contains: search, mode: 'insensitive' } } }
        ]
      };
    }

    const [total, payments, grouped] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              scheduled_at: true,
              estimated_cost: true,
              final_cost: true,
              customer: { select: { id: true, full_name: true, phone: true } },
              vehicle: { select: { plate_number: true, brand: true, model: true } }
            }
          },
          recorder: { select: { id: true, full_name: true } }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      // Rekap mengikuti filter yang sama, tapi tanpa paginasi.
      prisma.payment.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const summary = { paid: 0, pending: 0, failed: 0, paid_count: 0, pending_count: 0, failed_count: 0 };
    for (const row of grouped) {
      const amount = row._sum.amount ? Number(row._sum.amount) : 0;
      if (row.status === PaymentStatus.paid) {
        summary.paid = amount;
        summary.paid_count = row._count.id;
      } else if (row.status === PaymentStatus.pending) {
        summary.pending = amount;
        summary.pending_count = row._count.id;
      } else {
        summary.failed = amount;
        summary.failed_count = row._count.id;
      }
    }

    // Grafik pemasukan harian: hanya pembayaran lunas, dikelompokkan per tanggal WIB.
    const paidRows = await prisma.payment.findMany({
      where: { ...where, status: PaymentStatus.paid },
      select: { amount: true, paid_at: true, created_at: true },
      orderBy: { created_at: 'asc' },
      take: 2000
    });

    const byDay = new Map<string, number>();
    for (const p of paidRows) {
      const day = toWIBParts(p.paid_at ?? p.created_at).date;
      byDay.set(day, (byDay.get(day) ?? 0) + Number(p.amount));
    }
    const daily = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, amount]) => ({ day, amount }));

    return apiSuccess(
      {
        payments,
        summary,
        daily,
        meta: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      },
      'Daftar pembayaran berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data pembayaran');
  }
}

/** POST /api/v1/admin/payments — admin mencatat pembayaran pelanggan di kasir. */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { booking_id, amount, payment_type, method, status, midtrans_ref, note, paid_at } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: booking_id },
      select: { id: true, status: true, estimated_cost: true, final_cost: true }
    });

    if (!booking) {
      return apiError('Booking tidak ditemukan', 404);
    }

    if (booking.status === 'dibatalkan') {
      return apiError('Booking ini sudah dibatalkan, pembayaran tidak bisa dicatat.', 409);
    }

    const finalStatus = (status ?? 'paid') as PaymentStatus;

    const payment = await prisma.payment.create({
      data: {
        booking_id,
        amount,
        payment_type: payment_type as PaymentType,
        method: method as PaymentMethod,
        status: finalStatus,
        midtrans_ref: midtrans_ref ?? null,
        note: note ?? null,
        // paid_at hanya terisi kalau uangnya memang sudah diterima.
        paid_at: finalStatus === PaymentStatus.paid ? (paid_at ? new Date(paid_at) : new Date()) : null,
        recorded_by: user?.profileId || null
      },
      include: {
        booking: {
          select: {
            id: true,
            customer: { select: { full_name: true } },
            vehicle: { select: { plate_number: true } }
          }
        }
      }
    });

    return apiSuccess(payment, 'Pembayaran berhasil dicatat', 201);
  } catch (error: any) {
    return apiCatch(error, 'Gagal mencatat pembayaran');
  }
}
