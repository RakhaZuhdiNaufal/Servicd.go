import { Car, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function VehiclesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Car className="h-6 w-6 text-primary-500" />
        Kendaraan
      </h1>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-6 flex gap-4">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Endpoint belum tersedia</p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Daftar semua kendaraan milik pelanggan memerlukan endpoint{' '}
            <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">
              GET /api/v1/admin/vehicles
            </code>{' '}
            yang belum diimplementasi di backend. Ini adalah item yang perlu dibahas dengan tim backend.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Untuk saat ini, kendaraan tiap pelanggan dapat dilihat melalui{' '}
            <Link href="/admin/customers" className="font-semibold underline hover:no-underline">
              halaman Pelanggan
            </Link>
            {' '}→ klik baris pelanggan untuk melihat daftar kendaraannya.
          </p>
        </div>
      </div>
    </div>
  );
}
