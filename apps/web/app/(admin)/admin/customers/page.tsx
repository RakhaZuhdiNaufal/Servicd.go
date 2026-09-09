'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerSchema, type CreateCustomerInput } from '@servicego/shared';
import { SkeletonTable } from '@/components/skeletons';
import { toast } from 'sonner';
import { Plus, Search, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetCustomer, setSheetCustomer] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['admin-customers', page, search],
    queryFn: () =>
      fetcher(`/admin/customers?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema)
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      fetcher('/admin/customers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Pelanggan berhasil ditambahkan');
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      setDialogOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Pelanggan dihapus');
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      setSheetCustomer(null);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-primary-500" />
          Pelanggan
        </h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-2 transition"
        >
          <Plus className="h-4 w-4" />
          Tambah Pelanggan
        </button>
      </div>

      {/* Search */}
      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama, HP, email…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <button type="submit" className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
          Cari
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
            className="rounded-md px-2 py-2 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                {['Nama', 'No. HP', 'Email', 'Kendaraan', 'Booking', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data?.customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSheetCustomer(c)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{c.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-data">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.vehicles.length} kendaraan</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c._count.bookings} booking</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-primary-600 text-xs font-medium hover:underline">Detail →</span>
                  </td>
                </tr>
              ))}
              {!data?.customers.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada pelanggan ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{data.meta.total} pelanggan</span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 py-1">
              {page} / {data.meta.total_pages}
            </span>
            <button
              disabled={page === data.meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => addMutation.mutate(d))}
            className="space-y-4 py-2"
          >
            {[
              { id: 'full_name', label: 'Nama Lengkap', type: 'text', placeholder: 'Budi Santoso' },
              { id: 'phone', label: 'No. HP', type: 'tel', placeholder: '08xxx' },
              { id: 'email', label: 'Email', type: 'email', placeholder: 'budi@email.com' }
            ].map(({ id, label, type, placeholder }) => (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  {...register(id as keyof CreateCustomerInput)}
                  placeholder={placeholder}
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors[id as keyof typeof errors] && (
                  <p className="text-xs text-red-500">{errors[id as keyof typeof errors]?.message as string}</p>
                )}
              </div>
            ))}
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting || addMutation.isPending}
                className="rounded-md bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition disabled:opacity-50">
                {addMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Sheet */}
      <Sheet open={!!sheetCustomer} onOpenChange={(v) => !v && setSheetCustomer(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheetCustomer?.full_name}</SheetTitle>
          </SheetHeader>
          {sheetCustomer && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <p><span className="font-medium text-slate-800 dark:text-slate-200">Email: </span>{sheetCustomer.email}</p>
                <p><span className="font-medium text-slate-800 dark:text-slate-200">HP: </span><span className="font-data">{sheetCustomer.phone}</span></p>
                <p><span className="font-medium text-slate-800 dark:text-slate-200">Total Booking: </span>{sheetCustomer._count.bookings}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Kendaraan</p>
                {sheetCustomer.vehicles.length ? (
                  <div className="space-y-1">
                    {sheetCustomer.vehicles.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="font-data font-semibold text-slate-800 dark:text-slate-200">{v.plate_number}</span>
                        <span>·</span>
                        <span>{v.brand} {v.model}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">Belum ada kendaraan</p>
                )}
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    if (confirm(`Hapus pelanggan ${sheetCustomer.full_name}?`)) {
                      deleteMutation.mutate(sheetCustomer.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="w-full rounded-md border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-sm font-medium transition disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Menghapus…' : 'Hapus Pelanggan'}
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
