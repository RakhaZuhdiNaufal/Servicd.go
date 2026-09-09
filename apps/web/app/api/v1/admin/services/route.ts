import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { createServiceSchema } from '@servicego/shared';
import { apiSuccess, apiError } from '@/lib/response';

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
    return apiError(error.message || 'Gagal membuat layanan', 500);
  }
}
