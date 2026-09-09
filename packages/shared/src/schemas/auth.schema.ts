import { z } from 'zod';
import { USER_ROLE } from '../constants';

export const syncProfileSchema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit'),
  avatar_url: z.string().url('Format URL avatar tidak valid').optional().nullable(),
  role: z.enum(USER_ROLE).default('customer').optional()
});

export type SyncProfileInput = z.infer<typeof syncProfileSchema>;
