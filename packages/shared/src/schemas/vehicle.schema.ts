import { z } from 'zod';
import { VEHICLE_TYPE } from '../constants';

export const createVehicleSchema = z.object({
  plate_number: z.string().min(3, 'Plat nomor wajib diisi').max(20),
  brand: z.string().min(1, 'Merk wajib diisi'),
  model: z.string().min(1, 'Model wajib diisi'),
  year: z.number().int().min(1950, 'Tahun tidak valid').max(new Date().getFullYear() + 1, 'Tahun melebihi tahun sekarang'),
  vehicle_type: z.enum(VEHICLE_TYPE),
  last_odometer_km: z.number().int().nonnegative('Odometer tidak boleh negatif').default(0).optional()
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
