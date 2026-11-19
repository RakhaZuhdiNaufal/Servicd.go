// Aturan voucher / kode promo ServiceGo.
// Daftar promonya sekarang ada di tabel `promos` (dikelola admin lewat /admin/voucher);
// file ini hanya memuat aturannya, supaya server (POST /bookings) dan form booking pelanggan
// menghitung potongan dengan rumus yang sama persis.

import { z } from 'zod';

export const PROMO_DISCOUNT_TYPE = ['persen', 'nominal'] as const;
export type PromoDiscountType = (typeof PROMO_DISCOUNT_TYPE)[number];

/** Bentuk voucher yang dikirim ke klien oleh GET /api/v1/promos. */
export interface PromoDTO {
  id: string;
  code: string;
  title: string;
  description: string | null;
  badge: string | null;
  discount_type: PromoDiscountType;
  discount_value: number;
  max_discount: number | null;
  min_spend: number | null;
  /** Persen untuk voucher tipe `persen`, 0 untuk voucher nominal. Dipertahankan untuk tampilan lama. */
  discount_percent: number;
  quota: number | null;
  used_count: number;
  per_customer_limit: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

/** Tanggal hari ini di zona WIB (Asia/Jakarta), format YYYY-MM-DD. */
export function todayInWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
}

/**
 * Besar potongan (dibulatkan ke rupiah) untuk estimasi biaya tertentu.
 * Potongan tidak pernah melebihi biayanya sendiri, dan tidak melebihi `max_discount` bila diisi.
 */
export function computePromoDiscount(
  promo: Pick<PromoDTO, 'discount_type' | 'discount_value' | 'max_discount'>,
  estimatedCost: number
): number {
  if (estimatedCost <= 0) return 0;
  const raw =
    promo.discount_type === 'nominal'
      ? promo.discount_value
      : (estimatedCost * promo.discount_value) / 100;
  const capped = promo.max_discount != null ? Math.min(raw, promo.max_discount) : raw;
  return Math.max(0, Math.min(Math.round(capped), estimatedCost));
}

/**
 * Alasan voucher tidak bisa dipakai, atau null bila boleh.
 * Dipakai server sebelum menyimpan booking dan UI sebelum menampilkan potongan.
 */
export function promoBlockReason(
  promo: Pick<
    PromoDTO,
    'is_active' | 'valid_from' | 'valid_until' | 'quota' | 'used_count' | 'min_spend' | 'code'
  >,
  estimatedCost: number,
  now: Date = new Date()
): string | null {
  if (!promo.is_active) return `Kode ${promo.code} sedang tidak aktif.`;

  const today = todayInWIB(now);
  if (promo.valid_from && todayInWIB(new Date(promo.valid_from)) > today) {
    return `Kode ${promo.code} baru berlaku mulai ${todayInWIB(new Date(promo.valid_from))}.`;
  }
  if (promo.valid_until && todayInWIB(new Date(promo.valid_until)) < today) {
    return `Kode ${promo.code} sudah kedaluwarsa.`;
  }
  if (promo.quota != null && promo.used_count >= promo.quota) {
    return `Kuota kode ${promo.code} sudah habis dipakai.`;
  }
  if (promo.min_spend != null && estimatedCost < promo.min_spend) {
    return `Kode ${promo.code} butuh minimal belanja Rp ${promo.min_spend.toLocaleString('id-ID')}.`;
  }
  return null;
}

/** Ringkasan potongan untuk ditampilkan, misal "Diskon 20% (maks Rp 100.000)". */
export function promoSummary(promo: Pick<PromoDTO, 'discount_type' | 'discount_value' | 'max_discount'>): string {
  const base =
    promo.discount_type === 'nominal'
      ? `Potongan Rp ${promo.discount_value.toLocaleString('id-ID')}`
      : `Diskon ${promo.discount_value}%`;
  return promo.max_discount != null && promo.discount_type === 'persen'
    ? `${base} (maks Rp ${promo.max_discount.toLocaleString('id-ID')})`
    : base;
}

// ── Validasi input admin ─────────────────────────────────────────────

const optionalPositive = z.number().min(0).optional().nullable();

const promoBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Kode voucher minimal 3 karakter')
    .max(32, 'Kode voucher maksimal 32 karakter')
    .regex(/^[A-Za-z0-9-]+$/, 'Kode hanya boleh huruf, angka, dan tanda minus')
    .transform((v) => v.toUpperCase()),
  title: z.string().trim().min(1, 'Judul voucher wajib diisi'),
  description: z.string().max(500).optional().nullable(),
  badge: z.string().max(40).optional().nullable(),
  discount_type: z.enum(PROMO_DISCOUNT_TYPE).default('persen'),
  discount_value: z.number().positive('Besar potongan harus lebih dari 0'),
  max_discount: optionalPositive,
  min_spend: optionalPositive,
  quota: z.number().int().min(1, 'Kuota minimal 1').optional().nullable(),
  per_customer_limit: z.number().int().min(1, 'Batas per pelanggan minimal 1').optional().nullable(),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  is_active: z.boolean().default(true).optional()
});

/** Persen di atas 100% dan rentang tanggal terbalik ditolak di server maupun form admin. */
function checkPromoRules<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (v: any) => v.discount_type !== 'persen' || v.discount_value == null || v.discount_value <= 100,
      { message: 'Diskon persen tidak boleh lebih dari 100%', path: ['discount_value'] }
    )
    .refine((v: any) => !v.valid_from || !v.valid_until || v.valid_from <= v.valid_until, {
      message: 'Tanggal mulai tidak boleh setelah tanggal berakhir',
      path: ['valid_until']
    });
}

export const createPromoSchema = checkPromoRules(promoBaseSchema);
export const updatePromoSchema = checkPromoRules(promoBaseSchema.partial());

export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdatePromoInput = z.infer<typeof updatePromoSchema>;
