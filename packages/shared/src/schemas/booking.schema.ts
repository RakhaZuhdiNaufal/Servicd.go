import { z } from 'zod';
import { BOOKING_STATUS } from '../constants';

export const createBookingSchema = z.object({
  vehicle_id: z.string().uuid('ID kendaraan tidak valid'),
  service_ids: z.array(z.string().uuid('ID layanan tidak valid')).min(1, 'Pilih minimal 1 layanan'),
  scheduled_at: z.string().datetime({ message: 'Format tanggal/waktu harus ISO-8601 (contoh: 2026-09-10T09:00:00Z)' }),
  complaint_notes: z.string().optional().nullable(),
  branch_id: z.string().uuid('ID cabang tidak valid').optional().nullable(),
  promo_code: z.string().trim().max(32, 'Kode promo terlalu panjang').optional().nullable()
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUS, { errorMap: () => ({ message: 'Status booking tidak valid' }) }),
  note: z.string().optional().nullable()
});

export const assignMechanicSchema = z.object({
  mechanic_id: z.string().uuid('ID mekanik tidak valid')
});

export const availableSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  branch_id: z.string().uuid('ID cabang tidak valid').optional()
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type AssignMechanicInput = z.infer<typeof assignMechanicSchema>;
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;
