'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createServiceSchema, type CreateServiceInput } from '@servicego/shared';
import { SkeletonCard } from '@/components/skeletons';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Clock, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: { is_active: true }
  });

  function openAdd() {
    setEditTarget(null);
    reset({ is_active: true });
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditTarget(s);
    reset({
      name: s.name,
      description: s.description ?? undefined,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: s.is_active
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: CreateServiceInput) =>
      editTarget
        ? fetcher(`/admin/services/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : fetcher('/admin/services', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(editTarget ? 'Layanan diperbarui' : 'Layanan ditambahkan');
      qc.invalidateQueries({ queryKey: ['services'] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/admin/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Layanan dihapus');
      qc.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const formatRp = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (isLoading) return <SkeletonCard count={6} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary-500" />
          Layanan
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-2 transition"
        >
          <Plus className="h-4 w-4" />
          Tambah Layanan
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">{s.name}</h3>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  s.is_active
                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {s.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            {s.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{s.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm">
              <span className="font-data font-semibold text-primary-700 dark:text-primary-400">
                {formatRp(s.price)}
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                {s.duration_minutes} mnt
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => openEdit(s)}
                className="flex items-center gap-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Hapus layanan "${s.name}"?`)) deleteMutation.mutate(s.id);
                }}
                className="flex items-center gap-1.5 text-xs rounded border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="h-3 w-3" />
                Hapus
              </button>
            </div>
          </div>
        ))}
        {!services.length && (
          <div className="col-span-full text-center py-16 text-slate-400">
            Belum ada layanan — tambah layanan pertama
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Layanan' : 'Tambah Layanan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 py-2">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Layanan</label>
              <input
                id="name"
                {...register('name')}
                placeholder="Ganti Oli Mesin"
                className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi (opsional)</label>
              <textarea
                id="description"
                {...register('description')}
                rows={2}
                className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="price" className="text-sm font-medium text-slate-700 dark:text-slate-300">Harga (Rp)</label>
                <input
                  id="price"
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="150000"
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
              </div>
              <div className="space-y-1">
                <label htmlFor="duration_minutes" className="text-sm font-medium text-slate-700 dark:text-slate-300">Durasi (menit)</label>
                <input
                  id="duration_minutes"
                  type="number"
                  {...register('duration_minutes', { valueAsNumber: true })}
                  placeholder="60"
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.duration_minutes && <p className="text-xs text-red-500">{errors.duration_minutes.message}</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('is_active')} className="rounded" />
              <span className="text-slate-700 dark:text-slate-300">Layanan aktif</span>
            </label>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Batal
              </button>
              <button type="submit" disabled={saveMutation.isPending}
                className="rounded-md bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition disabled:opacity-50">
                {saveMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
