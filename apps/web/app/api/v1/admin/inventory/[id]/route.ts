import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { updateInventoryItemSchema } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';

// PUT /api/v1/admin/inventory/:id
// Ubah data barang. `services` (bila dikirim) menggantikan seluruh daftar layanan yang memakainya.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Barang tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = updateInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { services, stock_qty, ...data } = parsed.data;

    if (services?.length) {
      const found = await prisma.service.count({ where: { id: { in: services.map((s) => s.service_id) } } });
      if (found !== services.length) {
        return apiError('Ada layanan terpilih yang tidak ditemukan', 404);
      }
    }

    // Jumlah stok sengaja tidak diubah lewat endpoint ini: perubahan stok selalu lewat
    // POST /inventory/:id/stock supaya setiap perubahan punya jejak di stock_movements.
    const updated = await prisma.$transaction(async (tx) => {
      if (services) {
        await tx.serviceItem.deleteMany({ where: { item_id: id } });
        if (services.length) {
          await tx.serviceItem.createMany({
            data: services.map((s) => ({ item_id: id, service_id: s.service_id, qty_needed: s.qty_needed }))
          });
        }
      }

      return tx.inventoryItem.update({
        where: { id },
        data,
        include: {
          service_items: { include: { service: { select: { id: true, name: true, is_active: true } } } }
        }
      });
    });

    return apiSuccess(updated, 'Data barang berhasil diperbarui');
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui data barang');
  }
}

// DELETE /api/v1/admin/inventory/:id
// Barang yang masih dipakai layanan tidak dihapus permanen, cukup dinonaktifkan,
// supaya riwayat pemakaian dan hubungannya dengan layanan tidak hilang.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { _count: { select: { service_items: true, movements: true } } }
    });

    if (!existing) {
      return apiError('Barang tidak ditemukan', 404);
    }

    if (existing._count.service_items > 0 || existing._count.movements > 0) {
      const deactivated = await prisma.inventoryItem.update({
        where: { id },
        data: { is_active: false }
      });
      return apiSuccess(
        deactivated,
        existing._count.service_items > 0
          ? `Barang dinonaktifkan karena masih dipakai ${existing._count.service_items} layanan`
          : 'Barang dinonaktifkan agar riwayat stoknya tetap utuh'
      );
    }

    await prisma.inventoryItem.delete({ where: { id } });
    return apiSuccess(null, 'Barang berhasil dihapus');
  } catch (error: any) {
    return apiCatch(error, 'Gagal menghapus barang');
  }
}
