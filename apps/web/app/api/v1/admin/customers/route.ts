import { NextRequest } from 'next/server';
import { prisma, UserRole } from '@servicego/database';
import { createCustomerSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchParam = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      role: UserRole.customer
    };

    if (searchParam) {
      whereClause.OR = [
        { full_name: { contains: searchParam, mode: 'insensitive' } },
        { phone: { contains: searchParam, mode: 'insensitive' } },
        { email: { contains: searchParam, mode: 'insensitive' } }
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.profile.count({ where: whereClause }),
      prisma.profile.findMany({
        where: whereClause,
        include: {
          vehicles: true,
          _count: {
            select: { bookings: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return apiSuccess(
      {
        customers,
        meta: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      },
      'Daftar pelanggan berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data pelanggan');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { full_name, phone, email, avatar_url } = parsed.data;

    // Cek email duplikat
    const existing = await prisma.profile.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });

    if (existing) {
      return apiError('Email pelanggan sudah terdaftar', 409);
    }

    // Buat UUID untuk auth_user_id walk-in
    const generatedAuthUserId = crypto.randomUUID();

    const customer = await prisma.profile.create({
      data: {
        auth_user_id: generatedAuthUserId,
        full_name,
        phone,
        email,
        avatar_url: avatar_url ?? null,
        role: UserRole.customer
      }
    });

    return apiSuccess(customer, 'Pelanggan walk-in berhasil ditambahkan', 201);
  } catch (error: any) {
    return apiCatch(error, 'Gagal menambahkan pelanggan');
  }
}
