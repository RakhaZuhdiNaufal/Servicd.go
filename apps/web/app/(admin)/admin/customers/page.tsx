'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerSchema, type CreateCustomerInput } from '@servicego/shared';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatDate } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { EmptyState, ErrorState } from '@/components/customer/states';
import {
  AdminDialog,
  AdminPageHeader,
  Field,
  Initials,
  Pagination,
  SearchInput,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  btnDanger,
  btnPrimary,
  btnRow,
  btnSecondary,
  inputCls,
  tbodyCls,
  theadCls
} from '@/components/admin/resource-ui';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  vehicles: Array<{ id: string; plate_number: string; brand: string; model: string }>;
  _count: { bookings: number };
  created_at: string;
}

interface ListResponse {
  customers: Customer[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

const FIELDS: Array<{ id: keyof CreateCustomerInput; label: string; type: string; placeholder: string; autoComplete: string }> = [
  { id: 'full_name', label: 'Nama lengkap', type: 'text', placeholder: 'Nama sesuai KTP', autoComplete: 'name' },
  { id: 'phone', label: 'Nomor HP', type: 'tel', placeholder: '08xxxxxxxxxx', autoComplete: 'tel' },
  { id: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com', autoComplete: 'email' }
];

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ListResponse>({
    queryKey: ['admin-customers', page, search],
    queryFn: () =>
      fetcher(`/admin/customers?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)
  });

  // Hapus item terakhir di halaman terakhir: halaman itu kosong dan pager ikut hilang. Mundur ke halaman yang ada.
  useEffect(() => {
    if (data && page > 1 && page > data.meta.total_pages) setPage(Math.max(1, data.meta.total_pages));
  }, [data, page]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateCustomerInput>({ resolver: zodResolver(createCustomerSchema) });

  const saveMutation = useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      editTarget
        ? fetcher(`/admin/customers/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(input) })
        : fetcher('/admin/customers', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success(editTarget ? 'Data pelanggan diperbarui' : 'Pelanggan ditambahkan');
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Pelanggan dihapus');
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      setDeleteTarget(null);
      setDetail(null);
    },
    // Pesan error (mis. 409 karena masih punya booking) tampil di dialog konfirmasi
    onError: () => qc.invalidateQueries({ queryKey: ['admin-customers'] })
  });

  // Pelanggan dengan riwayat booking tidak bisa dihapus (API membalas 409)
  const deleteBlocked = !!deleteTarget && deleteTarget._count.bookings > 0;

  function openDelete(c: Customer) {
    deleteMutation.reset();
    setDeleteTarget(c);
  }

  function closeDelete() {
    setDeleteTarget(null);
    deleteMutation.reset();
  }

  function openAdd() {
    setEditTarget(null);
    reset({ full_name: '', phone: '', email: '' });
    saveMutation.reset();
    setFormOpen(true);
  }

  function openEdit(c: Customer) {
    setEditTarget(c);
    reset({ full_name: c.full_name, phone: c.phone, email: c.email });
    saveMutation.reset();
    setDetail(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearSearch() {
    setSearch('');
    setSearchInput('');
    setPage(1);
  }

  const customers = data?.customers ?? [];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Pelanggan"
        description="Akun pelanggan aplikasi dan pelanggan walk-in yang didaftarkan admin."
        action={
          <button type="button" onClick={openAdd} className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah pelanggan
          </button>
        }
      />

      <form onSubmit={submitSearch} role="search" className="flex flex-wrap items-center gap-2">
        <SearchInput
          id="customer-search"
          label="Cari pelanggan"
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Cari nama, nomor HP, atau email"
        />
        <button type="submit" className={btnSecondary}>
          Cari
        </button>
        {search && (
          <button type="button" onClick={clearSearch} className={btnRow}>
            Hapus pencarian
          </button>
        )}
      </form>

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : isError ? (
        <ErrorState title="Daftar pelanggan belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? `Tidak ada pelanggan untuk "${search}"` : 'Belum ada pelanggan'}
          description={
            search
              ? 'Coba kata kunci lain, misalnya sebagian nomor HP.'
              : 'Pelanggan yang mendaftar lewat aplikasi atau ditambahkan admin akan muncul di sini.'
          }
          action={search ? { label: 'Hapus pencarian', onClick: clearSearch } : { label: 'Tambah pelanggan', onClick: openAdd }}
        />
      ) : (
        <TableCard
          footer={
            data && (
              <Pagination
                page={page}
                totalPages={data.meta.total_pages}
                total={data.meta.total}
                unit="pelanggan"
                onChange={setPage}
              />
            )
          }
        >
          <div aria-busy={isFetching} className={isFetching ? 'opacity-70' : undefined}>
            {/* Desktop: tabel */}
            <table className="hidden w-full text-sm md:table">
              <thead className={theadCls}>
                <tr>
                  <Th>Nama</Th>
                  <Th>Kontak</Th>
                  <Th>Kendaraan</Th>
                  <Th align="right">Booking</Th>
                  <Th className="hidden xl:table-cell">Terdaftar</Th>
                  <Th align="right">
                    <span className="sr-only">Aksi</span>
                  </Th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {customers.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Initials name={c.full_name} />
                        <span className="whitespace-nowrap font-medium text-slate-900 dark:text-white">{c.full_name}</span>
                      </div>
                    </Td>
                    <Td>
                      <p className="tabular-nums text-slate-800 dark:text-slate-200">{c.phone}</p>
                      <p className="max-w-[200px] truncate text-[13px] text-slate-600 dark:text-slate-400">{c.email}</p>
                    </Td>
                    <Td>
                      {c.vehicles.length ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {c.vehicles.slice(0, 2).map((v) => (
                            <Plate key={v.id} number={v.plate_number} size="sm" />
                          ))}
                          {c.vehicles.length > 2 && (
                            <span className="text-[13px] text-slate-600 dark:text-slate-400">+{c.vehicles.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[13px] text-slate-600 dark:text-slate-400">Belum ada</span>
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums text-slate-800 dark:text-slate-200">
                      {c._count.bookings}
                    </Td>
                    <Td className="hidden whitespace-nowrap text-slate-600 dark:text-slate-400 xl:table-cell">
                      {formatDate(c.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setDetail(c)} className={btnRow} aria-label={`Detail ${c.full_name}`}>
                          Detail
                        </button>
                        <button type="button" onClick={() => openEdit(c)} className={btnRow} aria-label={`Ubah ${c.full_name}`}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Ubah
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile: daftar ringkas, ketuk untuk detail */}
            <ul className={`md:hidden ${tbodyCls}`}>
              {customers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(c)}
                    className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <Initials name={c.full_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900 dark:text-white">{c.full_name}</span>
                      <span className="block truncate text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                        {c.phone} · {c._count.bookings} booking
                      </span>
                    </span>
                    {c.vehicles[0] && <Plate number={c.vehicles[0].plate_number} size="sm" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </TableCard>
      )}

      {/* Tambah / ubah */}
      <AdminDialog
        open={formOpen}
        onClose={closeForm}
        title={editTarget ? 'Ubah data pelanggan' : 'Tambah pelanggan'}
        description={editTarget ? undefined : 'Untuk pelanggan walk-in yang belum punya akun aplikasi.'}
        footer={
          <>
            <button type="button" onClick={closeForm} className={btnSecondary}>
              Batal
            </button>
            <button type="submit" form="customer-form" disabled={saveMutation.isPending} className={btnPrimary}>
              {saveMutation.isPending ? 'Menyimpan...' : editTarget ? 'Simpan perubahan' : 'Simpan pelanggan'}
            </button>
          </>
        }
      >
        <form id="customer-form" noValidate onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          {FIELDS.map((f) => {
            const err = errors[f.id]?.message as string | undefined;
            return (
              <Field key={f.id} id={`c-${f.id}`} label={f.label} error={err} required>
                <input
                  id={`c-${f.id}`}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  placeholder={f.placeholder}
                  aria-invalid={!!err}
                  aria-describedby={err ? `c-${f.id}-error` : undefined}
                  {...register(f.id)}
                  className={inputCls}
                />
              </Field>
            );
          })}
          {saveMutation.isError && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {saveMutation.error.message}
            </p>
          )}
        </form>
      </AdminDialog>

      {/* Detail */}
      <AdminDialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.full_name ?? 'Pelanggan'}
        footer={
          detail && (
            <>
              <button
                type="button"
                onClick={() => openDelete(detail)}
                className={`${btnSecondary} text-red-700 dark:text-red-300 sm:mr-auto`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Hapus
              </button>
              <button type="button" onClick={() => openEdit(detail)} className={btnPrimary}>
                <Pencil className="h-4 w-4" aria-hidden />
                Ubah data
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
              <dt className="text-slate-600 dark:text-slate-400">Nomor HP</dt>
              <dd className="tabular-nums text-slate-900 dark:text-white">{detail.phone}</dd>
              <dt className="text-slate-600 dark:text-slate-400">Email</dt>
              <dd className="break-all text-slate-900 dark:text-white">{detail.email}</dd>
              <dt className="text-slate-600 dark:text-slate-400">Total booking</dt>
              <dd className="tabular-nums text-slate-900 dark:text-white">{detail._count.bookings}</dd>
              <dt className="text-slate-600 dark:text-slate-400">Terdaftar</dt>
              <dd className="text-slate-900 dark:text-white">{formatDate(detail.created_at)}</dd>
            </dl>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Kendaraan</h3>
              {detail.vehicles.length ? (
                <ul className="divide-y divide-slate-100 rounded-ctl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {detail.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="text-slate-800 dark:text-slate-200">
                        {v.brand} {v.model}
                      </span>
                      <Plate number={v.plate_number} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">Belum ada kendaraan terdaftar.</p>
              )}
            </div>
          </div>
        )}
      </AdminDialog>

      {/* Konfirmasi hapus. Pelanggan yang punya booking ditolak API (409) agar riwayat servis tetap utuh. */}
      <AdminDialog
        open={!!deleteTarget}
        onClose={closeDelete}
        size="sm"
        title={deleteBlocked ? 'Pelanggan tidak bisa dihapus' : 'Hapus pelanggan?'}
        footer={
          deleteBlocked ? (
            <button type="button" onClick={closeDelete} className={btnSecondary}>
              Tutup
            </button>
          ) : (
            <>
              <button type="button" onClick={closeDelete} className={btnSecondary}>
                Batal
              </button>
              <button
                type="button"
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className={btnDanger}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus pelanggan'}
              </button>
            </>
          )
        }
      >
        {deleteBlocked ? (
          <p role="alert" className="text-sm text-slate-700 dark:text-slate-300">
            {`${deleteTarget?.full_name} punya ${deleteTarget?._count.bookings} riwayat booking, jadi tidak bisa dihapus agar riwayat servis dan pembayarannya tetap utuh. Ubah datanya saja bila perlu, atau biarkan akunnya tanpa booking baru.`}
          </p>
        ) : (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Data <strong className="text-slate-900 dark:text-white">{deleteTarget?.full_name}</strong>
              {deleteTarget && deleteTarget.vehicles.length > 0
                ? ` beserta ${deleteTarget.vehicles.length} kendaraannya`
                : ''}{' '}
              akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            {deleteMutation.isError && (
              <p role="alert" className="text-red-700 dark:text-red-300">
                {deleteMutation.error.message}
              </p>
            )}
          </div>
        )}
      </AdminDialog>
    </div>
  );
}
