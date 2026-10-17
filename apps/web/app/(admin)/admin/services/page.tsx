'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createServiceSchema, type CreateServiceInput } from '@servicego/shared';
import { toast } from 'sonner';
import { Pencil, Plus, Power, Wrench } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatDuration, formatRp } from '@/lib/format';
import { EmptyState, ErrorState } from '@/components/customer/states';
import {
  ActiveBadge,
  AdminDialog,
  AdminPageHeader,
  Field,
  Segmented,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  btnDanger,
  btnPrimary,
  btnRow,
  btnRowDanger,
  btnSecondary,
  inputCls,
  tbodyCls,
  theadCls
} from '@/components/admin/resource-ui';

interface Service {
  id: string;
  name: string;
  description: string | null;
  // Prisma Decimal dikirim sebagai string ("350000.00")
  price: number | string;
  duration_minutes: number;
  is_active: boolean;
}

// Skema yang sama dengan API, hanya pesan untuk kolom angka kosong dibuat jelas.
const formSchema = createServiceSchema.extend({
  price: z
    .number({ invalid_type_error: 'Harga wajib diisi', required_error: 'Harga wajib diisi' })
    .positive('Harga layanan harus lebih dari 0'),
  duration_minutes: z
    .number({ invalid_type_error: 'Durasi wajib diisi', required_error: 'Durasi wajib diisi' })
    .int('Durasi harus bilangan bulat')
    .positive('Durasi harus minimal 1 menit')
});

type ActiveFilter = 'all' | 'active' | 'inactive';

export default function ServicesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Service | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  // Endpoint admin: layanan nonaktif ikut tampil (endpoint publik /services hanya yang aktif)
  const { data: allServices = [], isLoading, isError, error, refetch } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: () => fetcher('/admin/services')
  });

  const activeCount = allServices.filter((s) => s.is_active).length;
  const inactiveCount = allServices.length - activeCount;
  const services =
    activeFilter === 'active'
      ? allServices.filter((s) => s.is_active)
      : activeFilter === 'inactive'
        ? allServices.filter((s) => !s.is_active)
        : allServices;

  function invalidateServices() {
    qc.invalidateQueries({ queryKey: ['admin-services'] });
    // Cache daftar publik (dipakai form booking & landing) ikut disegarkan
    qc.invalidateQueries({ queryKey: ['services'] });
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateServiceInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { is_active: true }
  });

  function openAdd() {
    setEditTarget(null);
    reset({ name: '', description: '', is_active: true });
    saveMutation.reset();
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditTarget(s);
    reset({
      name: s.name,
      description: s.description ?? undefined,
      price: Number(s.price),
      duration_minutes: s.duration_minutes,
      is_active: s.is_active
    });
    saveMutation.reset();
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: CreateServiceInput) =>
      editTarget
        ? fetcher(`/admin/services/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : fetcher('/admin/services', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(editTarget ? 'Layanan diperbarui' : 'Layanan ditambahkan');
      invalidateServices();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  // API melakukan soft-delete: is_active = false
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Layanan dinonaktifkan');
      invalidateServices();
      setDeactivateTarget(null);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  // Aktifkan lagi layanan yang pernah dinonaktifkan
  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      fetcher(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify({ is_active: true }) }),
    onSuccess: () => {
      toast.success('Layanan diaktifkan lagi');
      invalidateServices();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const emptyFilterText =
    activeFilter === 'inactive' ? 'Tidak ada layanan nonaktif' : 'Tidak ada layanan aktif';

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Layanan"
        description="Semua layanan bengkel. Hanya layanan aktif yang bisa dipilih pelanggan saat booking."
        action={
          <button type="button" onClick={openAdd} className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah layanan
          </button>
        }
      />

      {!isLoading && !isError && allServices.length > 0 && (
        <Segmented<ActiveFilter>
          label="Filter status layanan"
          value={activeFilter}
          onChange={setActiveFilter}
          options={[
            { value: 'all', label: `Semua (${allServices.length})` },
            { value: 'active', label: `Aktif (${activeCount})` },
            { value: 'inactive', label: `Nonaktif (${inactiveCount})` }
          ]}
        />
      )}

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : isError ? (
        <ErrorState title="Daftar layanan belum bisa dimuat" message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : allServices.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Belum ada layanan"
          description="Tambahkan layanan pertama supaya pelanggan bisa mulai booking."
          action={{ label: 'Tambah layanan', onClick: openAdd }}
        />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={emptyFilterText}
          description="Pilih filter lain untuk melihat layanan lainnya."
          action={{ label: 'Tampilkan semua', onClick: () => setActiveFilter('all') }}
        />
      ) : (
        <TableCard
          footer={
            <p className="border-t border-slate-200 px-4 py-2.5 text-[13px] tabular-nums text-slate-600 dark:border-slate-800 dark:text-slate-400">
              {services.length} layanan
              {activeFilter === 'all' && inactiveCount > 0 ? `, ${inactiveCount} nonaktif` : ''}
            </p>
          }
        >
          <table className="hidden w-full text-sm md:table">
            <thead className={theadCls}>
              <tr>
                <Th>Layanan</Th>
                <Th align="right">Durasi</Th>
                <Th align="right">Harga</Th>
                <Th>Status</Th>
                <Th align="right">
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {services.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td>
                    <p className={s.is_active ? 'font-medium text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'}>
                      {s.name}
                    </p>
                    {s.description && (
                      <p className="max-w-xs truncate text-[13px] text-slate-600 dark:text-slate-400">{s.description}</p>
                    )}
                  </Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300">
                    {formatDuration(s.duration_minutes)}
                  </Td>
                  <Td align="right" className="whitespace-nowrap font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatRp(s.price)}
                  </Td>
                  <Td>
                    <ActiveBadge active={s.is_active} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openEdit(s)} className={btnRow} aria-label={`Ubah ${s.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Ubah
                      </button>
                      {s.is_active ? (
                        <button
                          type="button"
                          onClick={() => setDeactivateTarget(s)}
                          className={btnRowDanger}
                          aria-label={`Nonaktifkan ${s.name}`}
                        >
                          <Power className="h-3.5 w-3.5" aria-hidden />
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => activateMutation.mutate(s.id)}
                          disabled={activateMutation.isPending}
                          className={btnRow}
                          aria-label={`Aktifkan ${s.name}`}
                        >
                          <Power className="h-3.5 w-3.5" aria-hidden />
                          Aktifkan
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className={`md:hidden ${tbodyCls}`}>
            {services.map((s) => (
              <li key={s.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{s.name}</p>
                    <p className="text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                      {formatDuration(s.duration_minutes)}
                    </p>
                    {!s.is_active && (
                      <div className="mt-1">
                        <ActiveBadge active={false} />
                      </div>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">{formatRp(s.price)}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(s)} className={`${btnRow} h-11 border border-slate-200 dark:border-slate-700`} aria-label={`Ubah ${s.name}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Ubah
                  </button>
                  {s.is_active ? (
                    <button type="button" onClick={() => setDeactivateTarget(s)} className={`${btnRowDanger} h-11`} aria-label={`Nonaktifkan ${s.name}`}>
                      <Power className="h-3.5 w-3.5" aria-hidden />
                      Nonaktifkan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => activateMutation.mutate(s.id)}
                      disabled={activateMutation.isPending}
                      className={`${btnRow} h-11`}
                      aria-label={`Aktifkan ${s.name}`}
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden />
                      Aktifkan
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </TableCard>
      )}

      {/* Tambah / ubah */}
      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editTarget ? 'Ubah layanan' : 'Tambah layanan'}
        footer={
          <>
            <button type="button" onClick={() => setDialogOpen(false)} className={btnSecondary}>
              Batal
            </button>
            <button type="submit" form="service-form" disabled={saveMutation.isPending} className={btnPrimary}>
              {saveMutation.isPending ? 'Menyimpan...' : editTarget ? 'Simpan perubahan' : 'Simpan layanan'}
            </button>
          </>
        }
      >
        <form id="service-form" noValidate onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Field id="s-name" label="Nama layanan" error={errors.name?.message} required>
            <input
              id="s-name"
              {...register('name')}
              placeholder="Contoh: Ganti oli mesin"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 's-name-error' : undefined}
              className={inputCls}
            />
          </Field>
          <Field id="s-description" label="Deskripsi" hint="Opsional. Tampil di halaman detail layanan pelanggan.">
            <textarea
              id="s-description"
              rows={3}
              {...register('description')}
              aria-describedby="s-description-hint"
              className={`${inputCls} py-2`}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="s-price" label="Harga (Rp)" error={errors.price?.message} required>
              <input
                id="s-price"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                {...register('price', { valueAsNumber: true })}
                placeholder="150000"
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? 's-price-error' : undefined}
                className={`${inputCls} tabular-nums`}
              />
            </Field>
            <Field id="s-duration" label="Durasi (menit)" error={errors.duration_minutes?.message} required>
              <input
                id="s-duration"
                type="number"
                inputMode="numeric"
                min={1}
                {...register('duration_minutes', { valueAsNumber: true })}
                placeholder="60"
                aria-invalid={!!errors.duration_minutes}
                aria-describedby={errors.duration_minutes ? 's-duration-error' : undefined}
                className={`${inputCls} tabular-nums`}
              />
            </Field>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-ctl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
            <input type="checkbox" {...register('is_active')} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primary-600" />
            <span className="text-sm">
              <span className="block font-medium text-slate-900 dark:text-white">Layanan aktif</span>
              <span className="block text-[13px] text-slate-600 dark:text-slate-400">
                Layanan nonaktif tidak bisa dipilih pelanggan, tapi tetap tampil di daftar ini dengan label Nonaktif.
              </span>
            </span>
          </label>
          {saveMutation.isError && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {saveMutation.error.message}
            </p>
          )}
        </form>
      </AdminDialog>

      {/* Konfirmasi nonaktifkan */}
      <AdminDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        size="sm"
        title="Nonaktifkan layanan?"
        footer={
          <>
            <button type="button" onClick={() => setDeactivateTarget(null)} className={btnSecondary}>
              Batal
            </button>
            <button
              type="button"
              onClick={() => deactivateTarget && deleteMutation.mutate(deactivateTarget.id)}
              disabled={deleteMutation.isPending}
              className={btnDanger}
            >
              {deleteMutation.isPending ? 'Memproses...' : 'Nonaktifkan'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <strong className="text-slate-900 dark:text-white">{deactivateTarget?.name}</strong> tidak bisa dipilih lagi untuk
          booking baru. Riwayat booking yang memakai layanan ini tetap tersimpan.
        </p>
      </AdminDialog>
    </div>
  );
}
