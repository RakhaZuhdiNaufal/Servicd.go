import { prisma } from '@servicego/database';
import { stockStatus, worstStockStatus, type StockStatus } from '@servicego/shared';

export interface StockAlertItem {
  id: string;
  name: string;
  unit: string;
  stock_qty: number;
  min_qty: number;
  qty_needed: number;
  status: StockStatus;
}

export interface StockAlertService {
  id: string;
  name: string;
  is_active: boolean;
  status: Exclude<StockStatus, 'aman'>;
  items: StockAlertItem[];
}

export interface StockAlerts {
  out_of_stock_items: number;
  low_items: number;
  /** Layanan yang barangnya habis atau menipis, paling mendesak di urutan atas. */
  services: StockAlertService[];
}

/**
 * Peringatan stok untuk dashboard admin: layanan mana yang barangnya habis atau menipis,
 * sehingga layanannya perlu dinonaktifkan dari katalog sampai barangnya datang lagi.
 * Barang yang sudah dinonaktifkan tidak ikut dihitung.
 */
export async function getStockAlerts(): Promise<StockAlerts> {
  const [links, itemCounts] = await Promise.all([
    prisma.serviceItem.findMany({
      where: { item: { is_active: true } },
      include: {
        item: { select: { id: true, name: true, unit: true, stock_qty: true, min_qty: true } },
        service: { select: { id: true, name: true, is_active: true } }
      }
    }),
    prisma.inventoryItem.findMany({
      where: { is_active: true },
      select: { stock_qty: true, min_qty: true }
    })
  ]);

  const byService = new Map<string, StockAlertService>();

  for (const link of links) {
    const status = stockStatus(link.item.stock_qty, link.item.min_qty);
    if (status === 'aman') continue;

    const existing = byService.get(link.service_id);
    const entry: StockAlertItem = {
      id: link.item.id,
      name: link.item.name,
      unit: link.item.unit,
      stock_qty: link.item.stock_qty,
      min_qty: link.item.min_qty,
      qty_needed: link.qty_needed,
      status
    };

    if (existing) {
      existing.items.push(entry);
      existing.status = worstStockStatus(existing.items.map((i) => i.status)) as Exclude<StockStatus, 'aman'>;
    } else {
      byService.set(link.service_id, {
        id: link.service.id,
        name: link.service.name,
        is_active: link.service.is_active,
        status: status as Exclude<StockStatus, 'aman'>,
        items: [entry]
      });
    }
  }

  // Paling mendesak dulu: layanan yang masih aktif tapi barangnya habis.
  const services = [...byService.values()].sort((a, b) => {
    const urgency = (s: StockAlertService) => (s.status === 'habis' ? 0 : 1) + (s.is_active ? 0 : 2);
    return urgency(a) - urgency(b) || a.name.localeCompare(b.name, 'id-ID');
  });

  return {
    out_of_stock_items: itemCounts.filter((i) => stockStatus(i.stock_qty, i.min_qty) === 'habis').length,
    low_items: itemCounts.filter((i) => stockStatus(i.stock_qty, i.min_qty) === 'menipis').length,
    services
  };
}
