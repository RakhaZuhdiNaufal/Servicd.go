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
  distance?: string;
  badge?: string;
  available_slots_count?: number;
}

export interface TimeSlot {
  time: string;
  scheduled_at: string;
  is_available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  slots: TimeSlot[];
}
