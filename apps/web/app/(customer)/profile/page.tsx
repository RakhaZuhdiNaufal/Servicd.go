'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createVehicleSchema,
  updateVehicleSchema,
  type CreateVehicleInput
} from '@servicego/shared';
import { SkeletonCard } from '@/components/skeletons';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, LogOut, Car } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  vehicle_type: string;
  last_odometer_km: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher('/vehicles')
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema)
  });

  function openAdd() {
    setEditVehicle(null);
    reset({});
    setDialogOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditVehicle(v);
    reset({
      plate_number: v.plate_number,
      brand: v.brand,
      model: v.model,
      year: v.year,
      vehicle_type: v.vehicle_type as 'mobil' | 'motor',
      last_odometer_km: v.last_odometer_km
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      editVehicle
        ? fetcher(`/vehicles/${editVehicle.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : fetcher('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(editVehicle ? 'Kendaraan diperbarui' : 'Kendaraan ditambahkan');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/vehicles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Kendaraan dihapus');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Profil Saya</h1>

      {/* User info */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-lg">
            {(user?.user_metadata?.full_name ?? user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {user?.user_metadata?.full_name ?? 'Pelanggan'}
            </p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            {user?.user_metadata?.phone && (
              <p className="text-xs text-slate-400 font-data">{user.user_metadata.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Vehicles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Kendaraan Saya</h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </button>
        </div>

        {isLoading ? (
          <SkeletonCard count={2} />
        ) : vehicles.length === 0 ? (
          <button
            onClick={openAdd}
            className="w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 flex flex-col items-center gap-2 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition"
          >
            <Car className="h-8 w-8" />
            <span className="text-sm font-medium">Tambah Kendaraan Pertama</span>
          </button>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="font-data font-bold text-slate-800 dark:text-slate-200">{v.plate_number}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{v.brand} {v.model} {v.year}</p>
                    <p className="text-xs text-slate-500 capitalize">{v.vehicle_type} · {v.last_odometer_km.toLocaleString('id-ID')} km</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(v)}
                      className="p-2 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition"
                      aria-label="Edit kendaraan"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus kendaraan ${v.plate_number}?`)) deleteMutation.mutate(v.id);
                      }}
                      className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition"
                      aria-label="Hapus kendaraan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 py-3 text-sm font-medium transition"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVehicle ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 py-2">
            <div className="space-y-1">
              <label htmlFor="plate_number" className="text-sm font-medium text-slate-700 dark:text-slate-300">Plat Nomor</label>
              <input
                id="plate_number"
                {...register('plate_number')}
                placeholder="B 1234 XY"
                className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-data uppercase focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.plate_number && <p className="text-xs text-red-500">{errors.plate_number.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="brand" className="text-sm font-medium text-slate-700 dark:text-slate-300">Merk</label>
                <input id="brand" {...register('brand')} placeholder="Toyota"
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                {errors.brand && <p className="text-xs text-red-500">{errors.brand.message}</p>}
              </div>
              <div className="space-y-1">
                <label htmlFor="model" className="text-sm font-medium text-slate-700 dark:text-slate-300">Model</label>
                <input id="model" {...register('model')} placeholder="Avanza"
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                {errors.model && <p className="text-xs text-red-500">{errors.model.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="year" className="text-sm font-medium text-slate-700 dark:text-slate-300">Tahun</label>
                <input id="year" type="number" {...register('year', { valueAsNumber: true })} placeholder="2020"
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                {errors.year && <p className="text-xs text-red-500">{errors.year.message}</p>}
              </div>
              <div className="space-y-1">
                <label htmlFor="vehicle_type" className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipe</label>
                <select id="vehicle_type" {...register('vehicle_type')}
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option value="mobil">Mobil</option>
                  <option value="motor">Motor</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="last_odometer_km" className="text-sm font-medium text-slate-700 dark:text-slate-300">Odometer (km)</label>
              <input id="last_odometer_km" type="number" {...register('last_odometer_km', { valueAsNumber: true })} placeholder="15000"
                className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
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
