'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Car } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatDate } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState } from '@/components/customer/states';
import {
  AdminPageHeader,
  Pagination,
  SearchInput,
  Segmented,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  btnRow,
  btnSecondary,
  tbodyCls,
  theadCls
} from '@/components/admin/resource-ui';

type BookingStatus = 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
type TypeFilter = '' | 'mobil' | 'motor';

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

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'mobil', label: 'Mobil' },
  { value: 'motor', label: 'Motor' }
];

const shortDate = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

export default function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ListResponse>({
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
    setSearch(searchInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setSearchInput('');
    setTypeFilter('');
    setPage(1);
  }

  const vehicles = data?.vehicles ?? [];
  const filtered = !!search || !!typeFilter;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Kendaraan"
        description="Semua mobil dan motor milik pelanggan. Kendaraan didaftarkan pelanggan dari aplikasi."
      />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={submitSearch} role="search" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput
            id="vehicle-search"
            label="Cari kendaraan"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari plat, merek, model, atau pemilik"
          />
          <button type="submit" className={btnSecondary}>
            Cari
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              className={btnRow}
            >
              Hapus pencarian
            </button>
          )}
        </form>
        <Segmented
          label="Tipe kendaraan"
          value={typeFilter}
          options={TYPE_OPTIONS}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : isError ? (
        <ErrorState title="Daftar kendaraan belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title={filtered ? 'Tidak ada kendaraan yang cocok' : 'Belum ada kendaraan terdaftar'}
          description={
            filtered
              ? 'Coba kata kunci lain atau tampilkan semua tipe kendaraan.'
              : 'Kendaraan muncul di sini setelah pelanggan menambahkannya di aplikasi.'
          }
          action={filtered ? { label: 'Reset filter', onClick: resetFilters } : undefined}
        />
      ) : (
        <TableCard
          footer={
            data && (
              <Pagination
                page={page}
                totalPages={data.meta.total_pages}
                total={data.meta.total}
                unit="kendaraan"
                onChange={setPage}
              />
            )
          }
        >
          <div aria-busy={isFetching} className={isFetching ? 'opacity-70' : undefined}>
            <table className="hidden w-full text-sm lg:table">
              <thead className={theadCls}>
                <tr>
                  <Th>Plat nomor</Th>
                  <Th>Kendaraan</Th>
                  <Th>Pemilik</Th>
                  <Th align="right">Odometer</Th>
                  <Th align="right">Servis</Th>
                  <Th>Servis terakhir</Th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {vehicles.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <Td>
                      <Plate number={v.plate_number} size="md" />
                    </Td>
                    <Td>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {v.brand} {v.model}
                      </p>
                      <p className="text-[13px] text-slate-600 dark:text-slate-400">
                        {v.year} · {v.vehicle_type === 'mobil' ? 'Mobil' : 'Motor'}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-slate-900 dark:text-white">{v.owner.full_name}</p>
                      <p className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">{v.owner.phone || v.owner.email}</p>
                    </Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums text-slate-800 dark:text-slate-200">
                      {v.last_odometer_km.toLocaleString('id-ID')} km
                    </Td>
                    <Td align="right" className="tabular-nums text-slate-800 dark:text-slate-200">
                      {v.total_bookings}
                    </Td>
                    <Td>
                      {v.last_booking ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="whitespace-nowrap text-slate-700 dark:text-slate-300">{shortDate(v.last_booking.scheduled_at)}</span>
                          <StatusBadge status={v.last_booking.status as BookingStatus} size="sm" />
                        </div>
                      ) : (
                        <span className="text-[13px] text-slate-600 dark:text-slate-400">Belum pernah servis</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Layar kecil: kartu baris */}
            <ul className={`lg:hidden ${tbodyCls}`}>
              {vehicles.map((v) => (
                <li key={v.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {v.brand} {v.model} <span className="font-normal text-slate-600 dark:text-slate-400">{v.year}</span>
                      </p>
                      <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">{v.owner.full_name}</p>
                    </div>
                    <Plate number={v.plate_number} size="sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                    <span className="tabular-nums">{v.last_odometer_km.toLocaleString('id-ID')} km</span>
                    <span className="tabular-nums">{v.total_bookings} servis</span>
                    {v.last_booking ? (
                      <StatusBadge status={v.last_booking.status as BookingStatus} size="sm" />
                    ) : (
                      <span>Belum pernah servis</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </TableCard>
      )}
    </div>
  );
}
