'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { SkeletonTable } from '@/components/skeletons';
import { Car, Search, ChevronLeft, ChevronRight, User, Gauge, Calendar, Wrench } from 'lucide-react';

interface Vehicle {
  id: string;
  owner_id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  vehicle_type: 'mobil' | 'motor';
  last_odometer_km: number;
  created_at: string;
  total_bookings: number;
  owner: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    avatar_url: string | null;
  };
  last_booking: {
    id: string;
    status: string;
    scheduled_at: string;
  } | null;
}

interface ListResponse {
  vehicles: Vehicle[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export default function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['admin-vehicles', page, search, typeFilter],
    queryFn: () =>
      fetcher(
        `/admin/vehicles?page=${page}&limit=15${
          search ? `&search=${encodeURIComponent(search)}` : ''
        }${typeFilter ? `&vehicle_type=${typeFilter}` : ''}`
      )
  });

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Car className="h-6 w-6 text-primary-500" />
            <span>Kendaraan Pelanggan</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar seluruh kendaraan roda 4 dan roda 2 yang terdaftar di sistem
          </p>
        </div>

        {/* Filter Tipe Kendaraan */}
        <div className="flex items-center gap-2">
          {['', 'mobil', 'motor'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTypeFilter(t);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                typeFilter === t
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {t === '' ? 'Semua Tipe' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari plat nomor, merk, tipe, atau nama pemilik..."
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 transition"
        >
          Cari
        </button>
      </form>

      {/* Data Table */}
      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : !data || data.vehicles.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-400">
          <Car className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium text-slate-600 dark:text-slate-300">Tidak ada data kendaraan ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter tipe</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Plat Nomor</th>
                  <th className="px-4 py-3">Kendaraan</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Odometer Terakhir</th>
                  <th className="px-4 py-3">Pemilik</th>
                  <th className="px-4 py-3 text-center">Total Servis</th>
                  <th className="px-4 py-3">Servis Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-slate-800 dark:text-slate-200">
                        {v.plate_number}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {v.brand} {v.model}
                      </p>
                      <span className="text-xs text-slate-400 font-mono">Tahun {v.year}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          v.vehicle_type === 'mobil'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {v.vehicle_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5 text-slate-400" />
                        <span>{v.last_odometer_km.toLocaleString('id-ID')} km</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white text-xs truncate">
                            {v.owner.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400">{v.owner.phone || v.owner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Wrench className="h-3 w-3 text-slate-400" />
                        <span>{v.total_bookings}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {v.last_booking ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {new Date(v.last_booking.scheduled_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum pernah servis</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
              <span className="text-slate-500">
                Menampilkan <strong>{data.vehicles.length}</strong> dari <strong>{data.meta.total}</strong> kendaraan
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-slate-300 dark:border-slate-600 p-1.5 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Halaman {page} dari {data.meta.total_pages}
                </span>
                <button
                  disabled={page >= data.meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-slate-300 dark:border-slate-600 p-1.5 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
