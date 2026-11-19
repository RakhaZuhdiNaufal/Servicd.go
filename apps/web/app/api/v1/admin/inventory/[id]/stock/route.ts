import { NextRequest } from 'next/server';
import { prisma, StockMovementType } from '@servicego/database';
import { stockMovementSchema, stockStatus } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch, HttpError } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

// GET /api/v1/admin/inventory/:id/stock — riwayat pergerakan stok terbaru.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      return apiError('Barang tidak ditemukan', 404);
    }

    const movements = await prisma.stockMovement.findMany({
      where: { item_id: id },
      orderBy: { created_at: 'desc' },
      take: 30,
      include: { changer: { select: { id: true, full_name: true } } }
    });

    return apiSuccess(
      {
        item: {
          id: item.id,
          name: item.name,
          unit: item.unit,
          stock_qty: item.stock_qty,
          min_qty: item.min_qty,
          status: stockStatus(item.stock_qty, item.min_qty)
        },
        movements
      },
      'Riwayat stok berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil riwayat stok');
  }
}

// POST /api/v1/admin/inventory/:id/stock — tambah, kurangi, atau koreksi stok.
// Semua perubahan stok lewat sini supaya tercatat di stock_movements.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      return apiError('Barang tidak ditemukan', 404);
    }

    const body = await request.json();
    const parsed = stockMovementSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { type, quantity, note } = parsed.data;

    if (type !== 'penyesuaian' && quantity < 1) {
      return apiError('Jumlah barang minimal 1', 422);
    }

    const nextQty =
      type === 'masuk'
        ? item.stock_qty + quantity
        : type === 'keluar'
          ? item.stock_qty - quantity
          : quantity; // penyesuaian: hasil stok opname langsung dipakai

    if (nextQty < 0) {
      return apiError(
        `Stok ${item.name} tinggal ${item.stock_qty} ${item.unit}, tidak bisa dikurangi ${quantity}.`,
        409
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update bersyarat: kalau admin lain mengubah stok barang ini lebih dulu, batalkan
      // daripada menimpa hitungannya.
      const { count } = await tx.inventoryItem.updateMany({
        where: { id, stock_qty: item.stock_qty },
        data: { stock_qty: nextQty }
      });
      if (count === 0) {
        throw new HttpError('Stok barang ini baru saja diubah admin lain. Muat ulang lalu coba lagi.', 409);
      }

      await tx.stockMovement.create({
        data: {
          item_id: id,
          type: type as StockMovementType,
          quantity: type === 'penyesuaian' ? Math.abs(nextQty - item.stock_qty) : quantity,
          stock_after: nextQty,
          note: note ?? null,
          changed_by: user?.profileId || null
        }
      });

      return tx.inventoryItem.findUniqueOrThrow({ where: { id } });
    });

    const status = stockStatus(result.stock_qty, result.min_qty);
    const message =
      status === 'habis'
        ? `Stok ${result.name} sekarang habis. Nonaktifkan layanan yang memakainya.`
        : status === 'menipis'
          ? `Stok ${result.name} tinggal ${result.stock_qty} ${result.unit} (menipis).`
          : `Stok ${result.name} diperbarui menjadi ${result.stock_qty} ${result.unit}.`;

    return apiSuccess({ ...result, status }, message);
  } catch (error: any) {
    return apiCatch(error, 'Gagal memperbarui stok barang');
  }
}
