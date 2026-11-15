// Daftar paket promo ServiceGo. Satu sumber untuk GET /api/v1/promos dan validasi kode promo di POST /api/v1/bookings.
// Belum ada tabel promo di database: untuk menambah/mengubah promo, edit daftar ini.
// Aturan penerapan: diskon `discount_percent` dipotong dari estimasi biaya layanan yang dipilih saat booking.

export interface Promo {
  id: string;
  code: string;
  title: string;
  badge?: string;
  description: string;
  discount_percent: number;
  /** Tanggal terakhir berlaku (YYYY-MM-DD, zona WIB, inklusif). */
  valid_until: string;
  is_active: boolean;
}

export const PROMOS: Promo[] = [
  {
    id: 'promo-tuneup-ringan',
    code: 'HEMAT20',
    title: 'Paket Servis Ringan & Tune Up',
    badge: 'Paling Populer',
    description: 'Pembersihan ruang bakar, cek 24 titik kendaraan, filter udara, dan uji emisi.',
    discount_percent: 20,
    valid_until: '2026-12-31',
    is_active: true
  },
  {
    id: 'promo-rem-komplit',
    code: 'REMAMAN15',
    title: 'Paket Servis Rem Komplit',
    badge: 'Keselamatan Utama',
    description: 'Pembersihan kampas 4 roda, pengurasan minyak rem baru, dan balancing roda depan.',
    discount_percent: 15,
    valid_until: '2026-12-31',
    is_active: true
  },
  {
    id: 'promo-komplit-ac',
    code: 'SUPERCOMBO25',
    title: 'Paket Servis Komplit & AC Fresh',
    badge: 'Hemat Maksimal',
    description: 'Perawatan menyeluruh: servis berkala mesin + pembersihan sistem pendingin kabin.',
    discount_percent: 25,
    valid_until: '2026-12-31',
    is_active: true
  }
];

/** Tanggal hari ini di zona WIB (Asia/Jakarta), format YYYY-MM-DD. */
export function todayInWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
}

/** Promo yang masih berlaku untuk `code` (tidak peka huruf besar/kecil), atau null. */
export function findActivePromo(code: string | null | undefined, now: Date = new Date()): Promo | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const promo = PROMOS.find((p) => p.code === normalized);
  if (!promo || !promo.is_active) return null;
  if (todayInWIB(now) > promo.valid_until) return null;
  return promo;
}

/** Besar potongan (dibulatkan ke rupiah) untuk estimasi biaya tertentu. */
export function promoDiscount(promo: Promo, estimatedCost: number): number {
  return Math.round((estimatedCost * promo.discount_percent) / 100);
}
