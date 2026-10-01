import { NextRequest } from 'next/server';
import { prisma } from '@servicego/database';
import { apiSuccess, apiError } from '@/lib/response';

export async function GET(request: NextRequest) {
  try {
    // Ambil layanan aktif dari database untuk mencocokkan harga & item
    const services = await prisma.service.findMany({
      where: { is_active: true }
    });

    const promos = [
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

    return apiSuccess(promos, 'Daftar paket promo berhasil diambil');
  } catch (error: any) {
    return apiError(error.message || 'Gagal mengambil data promo', 500);
  }
}
