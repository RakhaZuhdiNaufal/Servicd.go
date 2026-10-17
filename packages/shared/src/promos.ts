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
  original_price: number;
  promo_price: number;
  /** Tanggal terakhir berlaku (YYYY-MM-DD, zona WIB, inklusif). */
  valid_until: string;
  is_active: boolean;
  included_items: string[];
}

export const PROMOS: Promo[] = [
  {
    id: 'promo-tuneup-ringan',
    code: 'HEMAT20',
    title: 'Paket Servis Ringan & Tune Up',
    badge: 'Paling Populer',
    description: 'Pembersihan ruang bakar, cek 24 titik kendaraan, filter udara, dan uji emisi.',
    discount_percent: 20,
    original_price: 425000,
    promo_price: 340000,
    valid_until: '2026-12-31',
    is_active: true,
    included_items: [
      'Tune-up mesin komprehensif',
      'Pembersihan throttle body & busi',
      'Scanning kelistrikan OBD2',
      'Gratis isi angin nitrogen 4 roda'
    ]
  },
  {
    id: 'promo-rem-komplit',
    code: 'REMAMAN15',
    title: 'Paket Servis Rem Komplit',
    badge: 'Keselamatan Utama',
    description: 'Pembersihan kampas 4 roda, pengurasan minyak rem baru, dan balancing roda depan.',
    discount_percent: 15,
    original_price: 350000,
    promo_price: 297500,
    valid_until: '2026-12-31',
    is_active: true,
    included_items: [
      'Bongkar & bersihkan kampas rem',
      'Flushing minyak rem DOT 3/4',
      'Pengecekan kebocoran master rem',
      'Uji pengereman dinamis'
    ]
  },
  {
    id: 'promo-komplit-ac',
    code: 'SUPERCOMBO25',
    title: 'Paket Servis Komplit & AC Fresh',
    badge: 'Hemat Maksimal',
    description: 'Perawatan menyeluruh: servis berkala mesin + pembersihan sistem pendingin kabin.',
    discount_percent: 25,
    original_price: 650000,
    promo_price: 487500,
    valid_until: '2026-12-31',
    is_active: true,
    included_items: [
      'Ganti oli full synthetic 4L',
      'Tune-up & pembersihan injector',
      'Fogging disinfektan kabin',
      'Pembersihan filter kabin & kisi AC'
    ]
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
