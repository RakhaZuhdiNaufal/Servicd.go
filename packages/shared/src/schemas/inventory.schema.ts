import { z } from 'zod';

/** Barang yang dipakai sebuah layanan, beserta jumlah pemakaian per servis. */
const serviceLinkSchema = z.object({
  service_id: z.string().uuid('ID layanan tidak valid'),
  qty_needed: z.number().int().min(1, 'Jumlah pemakaian minimal 1').default(1)
});

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  sku: z
    .string()
    .trim()
    .max(64, 'Kode barang maksimal 64 karakter')
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  unit: z.string().min(1, 'Satuan wajib diisi').default('pcs'),
  stock_qty: z.number().int().min(0, 'Stok tidak boleh negatif').default(0),
  min_qty: z.number().int().min(0, 'Stok minimum tidak boleh negatif').default(0),
  price: z.number().min(0, 'Harga tidak boleh negatif').optional().nullable(),
  note: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
  is_active: z.boolean().default(true).optional(),
  /** Layanan yang memakai barang ini. Dikirim lengkap: daftar ini menggantikan yang lama. */
  services: z.array(serviceLinkSchema).max(50, 'Terlalu banyak layanan terhubung').optional()
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

/**
 * Penyesuaian stok. `quantity` selalu positif; arahnya ditentukan `type`:
 * masuk menambah, keluar mengurangi, penyesuaian menetapkan stok ke angka hasil opname.
 */
export const stockMovementSchema = z.object({
  type: z.enum(['masuk', 'keluar', 'penyesuaian'], {
    errorMap: () => ({ message: 'Jenis pergerakan stok harus masuk, keluar, atau penyesuaian' })
  }),
  quantity: z.number().int().min(0, 'Jumlah tidak boleh negatif'),
  note: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable()
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
