import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Nama layanan wajib diisi'),
  description: z.string().optional().nullable(),
  price: z.number().positive('Harga layanan harus lebih dari 0'),
  duration_minutes: z.number().int().positive('Durasi harus minimal 1 menit'),
  is_active: z.boolean().default(true).optional()
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
