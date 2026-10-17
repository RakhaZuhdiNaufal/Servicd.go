// Bentuk data mengikuti respons API /api/v1 (sumber: Prisma schema).
// Kolom Decimal (price) dikirim sebagai string oleh Prisma, jadi tipenya number | string.

export interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  year?: number;
  vehicle_type: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  duration_minutes: number;
  is_active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  capacity_per_slot?: number;
}

export interface TimeSlot {
  time: string;
  scheduled_at: string;
  capacity?: number;
  booked?: number;
  available?: number;
  is_available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  branch_id?: string | null;
  capacity_per_slot?: number;
  slots: TimeSlot[];
}

/** Paket promo dari GET /api/v1/promos (sumber: packages/shared/src/promos.ts). */
export interface PromoInfo {
  id: string;
  code: string;
  title: string;
  discount_percent: number;
  valid_until: string;
  is_active: boolean;
}

export type BookingStepKey = 'kendaraan' | 'layanan' | 'bengkel' | 'jadwal';

export interface BookingStep {
  key: BookingStepKey;
  number: number;
  label: string;
  done: boolean;
}

/** id elemen section tiap langkah, dipakai stepper untuk lompat ke langkah. */
export const STEP_ANCHOR: Record<BookingStepKey, string> = {
  kendaraan: 'langkah-kendaraan',
  layanan: 'langkah-layanan',
  bengkel: 'langkah-bengkel',
  jadwal: 'langkah-jadwal'
};
