// Aturan status stok barang bengkel. Satu sumber untuk API admin, halaman Stok, dan
// peringatan di dashboard, supaya "habis" berarti sama di semua tempat.

export const STOCK_STATUS = ['habis', 'menipis', 'aman'] as const;
export type StockStatus = (typeof STOCK_STATUS)[number];

/**
 * Status sebuah barang:
 * - `habis`   : stok 0 atau kurang. Layanan yang memakainya tidak bisa dikerjakan.
 * - `menipis` : stok masih ada tapi sudah menyentuh ambang minimum (`min_qty`).
 * - `aman`    : stok di atas ambang minimum.
 */
export function stockStatus(stockQty: number, minQty: number): StockStatus {
  if (stockQty <= 0) return 'habis';
  if (stockQty <= minQty) return 'menipis';
  return 'aman';
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  habis: 'Habis',
  menipis: 'Menipis',
  aman: 'Aman'
};

/** Status gabungan beberapa barang: yang paling buruk menentukan. */
export function worstStockStatus(statuses: StockStatus[]): StockStatus {
  if (statuses.includes('habis')) return 'habis';
  if (statuses.includes('menipis')) return 'menipis';
  return 'aman';
}

/** Berapa kali servis masih bisa dikerjakan dengan stok sekarang (0 = tidak bisa sama sekali). */
export function servicesLeftFromStock(stockQty: number, qtyNeeded: number): number {
  if (qtyNeeded <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(stockQty / qtyNeeded));
}
