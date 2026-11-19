import { NextRequest } from 'next/server';
import { prisma, Prisma, StockMovementType } from '@servicego/database';
import { createInventoryItemSchema, stockStatus } from '@servicego/shared';
import { apiSuccess, apiError, apiCatch } from '@/lib/response';
import { getAuthenticatedUser } from '@/lib/auth';

// GET /api/v1/admin/inventory?search=&status=habis|menipis|aman&only_active=true
// Daftar barang bengkel beserta layanan yang memakainya.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const statusFilter = searchParams.get('status');
    const onlyActive = searchParams.get('only_active') === 'true';

    const where: Prisma.InventoryItemWhereInput = {};
    if (onlyActive) where.is_active = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        service_items: {
          include: {
            service: { select: { id: true, name: true, is_active: true } }
          }
        }
      },
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }]
    });

    const formatted = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      stock_qty: item.stock_qty,
      min_qty: item.min_qty,
      price: item.price ? Number(item.price) : null,
      note: item.note,
      is_active: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
      status: stockStatus(item.stock_qty, item.min_qty),
      services: item.service_items.map((si) => ({
        service_id: si.service_id,
        qty_needed: si.qty_needed,
        name: si.service.name,
        is_active: si.service.is_active
      }))
    }));

    // Filter status dihitung di aplikasi karena "habis/menipis" adalah perbandingan antar kolom.
    const rows =
      statusFilter === 'habis' || statusFilter === 'menipis' || statusFilter === 'aman'
        ? formatted.filter((i) => i.status === statusFilter)
        : formatted;

    return apiSuccess(
      {
        items: rows,
        meta: {
          total: rows.length,
          out_of_stock: formatted.filter((i) => i.status === 'habis').length,
          low: formatted.filter((i) => i.status === 'menipis').length
        }
      },
      'Daftar stok barang berhasil diambil'
    );
  } catch (error: any) {
    return apiCatch(error, 'Gagal mengambil data stok barang');
  }
}

// POST /api/v1/admin/inventory — tambah barang baru (beserta layanan yang memakainya).
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    const parsed = createInventoryItemSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validasi gagal', 422, parsed.error.format());
    }

    const { services, ...data } = parsed.data;

    if (services?.length) {
      const found = await prisma.service.count({ where: { id: { in: services.map((s) => s.service_id) } } });
      if (found !== services.length) {
        return apiError('Ada layanan terpilih yang tidak ditemukan', 404);
      }
    }

    // Stok awal langsung tercatat sebagai pergerakan "masuk", supaya riwayatnya utuh sejak hari pertama.
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          ...data,
          service_items: services?.length
            ? { create: services.map((s) => ({ service_id: s.service_id, qty_needed: s.qty_needed })) }
            : undefined
        }
      });

      if (created.stock_qty > 0) {
        await tx.stockMovement.create({
          data: {
            item_id: created.id,
            type: StockMovementType.masuk,
            quantity: created.stock_qty,
            stock_after: created.stock_qty,
            note: 'Stok awal saat barang didaftarkan',
            changed_by: user?.profileId || null
          }
        });
      }

      return created;
    });

    return apiSuccess(item, 'Barang berhasil ditambahkan', 201);
  } catch (error: any) {
    return apiCatch(error, 'Gagal menambahkan barang');
  }
}
