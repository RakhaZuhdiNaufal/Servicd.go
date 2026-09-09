import { z } from 'zod';

export const createCustomerSchema = z.object({
  full_name: z.string().min(1, 'Nama pelanggan wajib diisi'),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit'),
  email: z.string().email('Format email tidak valid'),
  avatar_url: z.string().url('Format URL avatar tidak valid').optional().nullable()
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
