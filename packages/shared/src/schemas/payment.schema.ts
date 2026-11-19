import { z } from 'zod';

export const PAYMENT_METHOD = ['tunai', 'transfer', 'kartu', 'ewallet'] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHOD)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodValue, string> = {
  tunai: 'Tunai',
  transfer: 'Transfer bank',
  kartu: 'Kartu debit/kredit',
  ewallet: 'E-wallet / QRIS'
};

export const PAYMENT_TYPE_LABEL: Record<'dp' | 'pelunasan', string> = {
  dp: 'DP / uang muka',
  pelunasan: 'Pelunasan'
};

export const PAYMENT_STATUS_LABEL: Record<'pending' | 'paid' | 'failed', string> = {
  pending: 'Menunggu',
  paid: 'Lunas',
  failed: 'Gagal'
};

/** Pencatatan pembayaran oleh admin di kasir bengkel. */
export const createPaymentSchema = z.object({
  booking_id: z.string().uuid('Booking tidak valid'),
  amount: z.number().positive('Jumlah pembayaran harus lebih dari 0'),
  payment_type: z.enum(['dp', 'pelunasan'], {
    errorMap: () => ({ message: 'Jenis pembayaran harus DP atau pelunasan' })
  }),
  method: z.enum(PAYMENT_METHOD, {
    errorMap: () => ({ message: 'Cara bayar tidak dikenal' })
  }),
  status: z.enum(['pending', 'paid', 'failed']).default('paid').optional(),
  midtrans_ref: z.string().max(100, 'Referensi maksimal 100 karakter').optional().nullable(),
  note: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
  /** Waktu pembayaran diterima (ISO). Kosong = sekarang, dipakai saat status `paid`. */
  paid_at: z.string().datetime({ offset: true }).optional().nullable()
});

export const updatePaymentSchema = z.object({
  status: z.enum(['pending', 'paid', 'failed']).optional(),
  amount: z.number().positive('Jumlah pembayaran harus lebih dari 0').optional(),
  method: z.enum(PAYMENT_METHOD).optional(),
  payment_type: z.enum(['dp', 'pelunasan']).optional(),
  midtrans_ref: z.string().max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  paid_at: z.string().datetime({ offset: true }).optional().nullable()
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
