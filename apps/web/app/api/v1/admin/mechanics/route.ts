import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError } from '@/lib/response';
import { z } from 'zod';

const createMechanicSchema = z.object({
  branch_id: z.string().uuid('ID cabang tidak valid'),
  full_name: z.string().min(1, 'Nama mekanik wajib diisi'),
  specialty: z.string().min(1, 'Spesialisasi wajib diisi'),
  is_active: z.boolean().default(true).optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const isActiveParam = searchParams.get('is_active');

    const whereClause: any = {};
    if (branchId) whereClause.branch_id = branchId;
    if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== '') {
      whereClause.is_active = isActiveParam === 'true';
    }

    const mechanics = await prisma.mechanic.findMany({
      where: whereClause,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true
          }
        },
        _count: {
          select: {
            bookings: {
              where: {
                status: 'diproses'
              }
            }
          }
        }
      },
      orderBy: { full_name: 'asc' }
    });

    const formatted = mechanics.map((m) => ({
      id: m.id,
      branch_id: m.branch_id,
      full_name: m.full_name,
      specialty: m.specialty,
      is_active: m.is_active,
      branch: m.branch,
      active_jobs_count: m._count.bookings
    }));

    return apiSuccess(formatted, 'Daftar mekanik berhasil diambil');
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengambil data mekanik', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createMechanicSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { branch_id, full_name, specialty, is_active } = parsed.data;

    // Pastikan cabang ada
    const branch = await prisma.branch.findUnique({
      where: { id: branch_id }
    });

    if (!branch) {
      return apiError('Cabang bengkel tidak ditemukan', 404);
    }

    const mechanic = await prisma.mechanic.create({
      data: {
        branch_id,
        full_name,
        specialty,
        is_active: is_active ?? true
      },
      include: {
        branch: true
      }
    });

    return apiSuccess(mechanic, 'Mekanik berhasil ditambahkan', 201);
  } catch (error: any) {
    return apiError(error.message || 'Gagal menambahkan mekanik', 500);
  }
}
