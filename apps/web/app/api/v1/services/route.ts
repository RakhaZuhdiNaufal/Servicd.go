import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

export async function GET(request: NextRequest) {
  try {
    const services = await prisma.service.findMany({
      where: { is_active: true },
      orderBy: { price: 'asc' }
    });

    return apiSuccess(services, 'Daftar layanan aktif berhasil diambil');
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data layanan');
  }
}
