import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { createServiceSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

// GET /api/v1/admin/services?is_active=true|false
// Berbeda dengan GET /api/v1/services (publik, hanya aktif): admin melihat layanan nonaktif juga.
export async function GET(request: NextRequest) {
  try {
    const isActiveParam = new URL(request.url).searchParams.get('is_active');
    const where =
      isActiveParam === 'true' ? { is_active: true } : isActiveParam === 'false' ? { is_active: false } : {};

    const services = await prisma.service.findMany({
      where,
      orderBy: [{ is_active: 'desc' }, { price: 'asc' }]
    });

    return apiSuccess(services, 'Daftar layanan admin berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data layanan');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createServiceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { name, description, price, duration_minutes, is_active } = parsed.data;

    const service = await prisma.service.create({
      data: {
        name,
        description: description ?? null,
        price,
        duration_minutes,
        is_active: is_active ?? true
      }
    });

    return apiSuccess(service, 'Layanan berhasil dibuat', 201);
  } catch (error: any) {
    return apiCatch(error, 'Gagal membuat layanan');
  }
}
