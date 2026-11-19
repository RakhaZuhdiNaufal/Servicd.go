'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createVehicleSchema, type CreateVehicleInput } from '@servicego/shared';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Bike, CalendarPlus, Car, Gauge, Loader2, Lock, LogOut, Mail, Pencil, Phone, Plus, Trash2, Wrench, X } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { formatDate, formatRp } from '@/lib/format';
import { Plate } from '@/components/customer/plate';
import { MaintenanceList } from '@/components/customer/maintenance-list';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { btnDanger, btnPrimary, btnSecondary, h1, h2 } from '@/components/customer/ui';

/** Bentuk data GET /api/v1/profile */
interface ProfileResponse {
  profile: {
    id: string;
    auth_user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
  };
  stats: {
    total_bookings: number;
    total_spent: number;
    last_service_date: string | null;
  };
}

/** Bentuk data GET /api/v1/vehicles */
interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  vehicle_type: 'mobil' | 'motor';
  last_odometer_km: number;
  last_service_date: string | null;
}

const inputClass =
  'h-11 w-full rounded-ctl border bg-white px-3.5 text-[15px] text-slate-900 placeholder:text-slate-500 transition-colors dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500';
const labelClass = 'block text-sm font-medium text-slate-800 dark:text-slate-200';
const errorTextClass = 'text-sm text-red-700 dark:text-red-300';

function borderFor(error?: unknown) {
  return error ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700';
}

/** Pesan bawaan zod untuk angka kosong berbahasa Inggris; ganti dengan kalimat yang jelas. */
function fieldMessage(err: FieldError | undefined, fallback: string) {
  if (!err) return null;
  const msg = err.message ?? '';
  return !msg || /expected|nan|required|invalid/i.test(msg) ? fallback : msg;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : (parts[0] ?? '?').slice(0, 1);
  return letters.toUpperCase();
}

/**
 * Dialog berbasis elemen <dialog> bawaan browser: Escape menutup, fokus terkunci di dalam,
 * dan fokus kembali ke tombol pemicu saat ditutup. Tanpa animasi (MOTION 1).
 */
function Modal({
  open,
  onClose,
  title,
  description,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        // Klik di area gelap (backdrop) menutup dialog
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[20px] border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    >
      {open && (
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 id={titleId} className="text-[20px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
                {title}
              </h2>
              {description && (
                <div id={descId} className="text-sm text-slate-600 dark:text-slate-400">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog"
              className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">{children}</div>;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [nameOpen, setNameOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  const [fullNameInput, setFullNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<{ field: 'current' | 'new' | 'confirm' | 'form'; message: string } | null>(
    null
  );
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: () => fetcher<ProfileResponse>('/profile')
  });

  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher<Vehicle[]>('/vehicles')
  });

  const {
    register: registerVehicle,
    handleSubmit: handleVehicleSubmit,
    reset: resetVehicleForm,
    formState: { errors: vehicleErrors }
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema)
  });

  // PUT /profile menerima { full_name?, phone? }
  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name?: string; phone?: string }) =>
      fetcher('/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast.success('Profil berhasil diperbarui');
      qc.invalidateQueries({ queryKey: ['profile'] });
      setNameOpen(false);
      setPhoneOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal memperbarui profil')
  });

  // POST /vehicles atau PUT /vehicles/[id] dengan payload createVehicleSchema
  const saveVehicleMutation = useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      editVehicle
        ? fetcher(`/vehicles/${editVehicle.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : fetcher('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(editVehicle ? 'Data kendaraan diperbarui' : 'Kendaraan ditambahkan');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setVehicleOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal menyimpan kendaraan')
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/vehicles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Kendaraan dihapus');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal menghapus kendaraan')
  });

  const profile = profileQuery.data?.profile;
  const stats = profileQuery.data?.stats;
  const fullName = profile?.full_name || user?.user_metadata?.full_name || 'Pelanggan';
  const email = profile?.email || user?.email || '';
  const phone = profile?.phone || user?.user_metadata?.phone || '';
  const vehicles = vehiclesQuery.data ?? [];

  function openEditName() {
    setFullNameInput(fullName === 'Pelanggan' ? '' : fullName);
    setNameError(null);
    setNameOpen(true);
  }

  function openEditPhone() {
    setPhoneInput(phone);
    setPhoneError(null);
    setPhoneOpen(true);
  }

  function openPassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordOpen(true);
  }

  function openAddVehicle() {
    setEditVehicle(null);
    resetVehicleForm({
      plate_number: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      vehicle_type: 'mobil',
      last_odometer_km: 0
    });
    setVehicleOpen(true);
  }

  function openEditVehicle(v: Vehicle) {
    setEditVehicle(v);
    resetVehicleForm({
      plate_number: v.plate_number,
      brand: v.brand,
      model: v.model,
      year: v.year,
      vehicle_type: v.vehicle_type,
      last_odometer_km: v.last_odometer_km
    });
    setVehicleOpen(true);
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const value = fullNameInput.trim();
    if (value.length < 2) {
      setNameError('Nama lengkap minimal 2 karakter.');
      return;
    }
    setNameError(null);
    updateProfileMutation.mutate({ full_name: value });
  }

  function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    const value = phoneInput.trim();
    if (value.length < 8) {
      setPhoneError('Nomor HP minimal 8 digit.');
      return;
    }
    setPhoneError(null);
    updateProfileMutation.mutate({ phone: value });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError({ field: 'current', message: 'Isi password saat ini.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError({ field: 'new', message: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError({ field: 'confirm', message: 'Konfirmasi password belum sama.' });
      return;
    }
    setPasswordError(null);
    try {
      setPasswordLoading(true);
      // Verifikasi ulang: sesi yang terbuka di perangkat orang lain tidak cukup untuk mengambil alih akun.
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (reauthError) {
        setPasswordError({ field: 'current', message: 'Password saat ini salah.' });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password berhasil diperbarui');
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError({ field: 'form', message: err?.message || 'Gagal mengubah password' });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success('Kamu sudah keluar dari akun');
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="max-w-2xl space-y-3">
        <h1 className={h1}>
          Profil
        </h1>
        <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
          Data akun dan kendaraan yang kamu pakai untuk booking servis.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
        {/* Kolom akun */}
        <section aria-labelledby="akun-heading" className="space-y-4 lg:col-span-1">
          <h2 id="akun-heading" className="sr-only">
            Akun
          </h2>

          {profileQuery.isLoading ? (
            <div
              className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              aria-busy
              aria-label="Memuat profil"
            >
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-4 w-full" />
                </div>
              </div>
              <SkeletonBlock className="h-11 w-full" />
              <SkeletonBlock className="h-11 w-full" />
            </div>
          ) : profileQuery.isError ? (
            <ErrorState
              title="Profil belum bisa dimuat"
              message={(profileQuery.error as Error)?.message}
              onRetry={() => profileQuery.refetch()}
            />
          ) : (
            <>
              <div className="rounded-[20px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3.5">
                  <span
                    aria-hidden
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-100"
                  >
                    {initials(fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[19px] font-bold leading-tight tracking-[-0.01em] text-slate-900 dark:text-white break-words">
                      {fullName}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Akun pelanggan</p>
                  </div>
                </div>

                <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  <div className="flex items-start gap-3 py-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <dt className="text-[13px] text-slate-600 dark:text-slate-400">Email (tidak bisa diubah)</dt>
                      <dd className="text-[15px] text-slate-900 dark:text-white break-all">{email || '-'}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <dt className="text-[13px] text-slate-600 dark:text-slate-400">No. HP (WhatsApp)</dt>
                      <dd className="text-[15px] text-slate-900 dark:text-white">
                        {phone || <span className="text-slate-600 dark:text-slate-400">Belum diisi</span>}
                      </dd>
                    </div>
                  </div>
                </dl>

                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={openEditName} className={btnSecondary}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Ubah nama
                  </button>
                  <button type="button" onClick={openEditPhone} className={btnSecondary}>
                    <Phone className="h-4 w-4" aria-hidden />
                    {phone ? 'Ubah no. HP' : 'Isi no. HP'}
                  </button>
                  <button type="button" onClick={openPassword} className={btnSecondary}>
                    <Lock className="h-4 w-4" aria-hidden />
                    Ubah password
                  </button>
                </div>
              </div>

              {stats && (
                <div className="rounded-[20px] bg-slate-900 p-6 text-white dark:bg-slate-950 dark:ring-1 dark:ring-slate-800">
                  <h3 className="text-[15px] font-bold text-blue-300">Ringkasan servis</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                    <div>
                      <dt className="text-[13px] text-slate-300">Booking (tanpa yang batal)</dt>
                      <dd className="mt-0.5 text-[30px] font-bold leading-none tracking-[-0.015em]">
                        {stats.total_bookings}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[13px] text-slate-300">Servis terakhir</dt>
                      <dd className="mt-1.5 text-[15px] font-semibold">
                        {stats.last_service_date
                          ? formatDate(stats.last_service_date, { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Belum ada'}
                      </dd>
                    </div>
                    <div className="col-span-2 border-t border-slate-700 pt-4">
                      <dt className="text-[13px] text-slate-300">Biaya servis selesai (estimasi)</dt>
                      <dd className="mt-0.5 text-[24px] font-bold tracking-[-0.015em]">{formatRp(stats.total_spent)}</dd>
                    </div>
                  </dl>
                  <Link
                    href="/bookings"
                    className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-ctl border border-slate-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Lihat riwayat booking
                  </Link>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-ctl border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Keluar dari akun
          </button>
        </section>

        {/* Fokus halaman: kendaraan saya */}
        <section aria-labelledby="kendaraan-heading" className="order-first space-y-5 lg:order-none lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2
                id="kendaraan-heading"
                className={h2}
              >
                Kendaraan saya
              </h2>
              <p className="text-[15px] text-slate-600 dark:text-slate-400">
                Kendaraan di sini bisa langsung dipilih saat booking.
              </p>
            </div>
            {vehicles.length > 0 && (
              <button type="button" onClick={openAddVehicle} className={btnPrimary}>
                <Plus className="h-4 w-4" aria-hidden />
                Tambah kendaraan
              </button>
            )}
          </div>

          {vehiclesQuery.isLoading && (
            <div className="grid gap-4 sm:grid-cols-2" aria-busy aria-label="Memuat kendaraan">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <SkeletonBlock className="h-8 w-32" />
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-4 w-1/2" />
                  <SkeletonBlock className="h-11 w-full" />
                </div>
              ))}
            </div>
          )}

          {vehiclesQuery.isError && (
            <ErrorState
              title="Daftar kendaraan belum bisa dimuat"
              message={(vehiclesQuery.error as Error)?.message}
              onRetry={() => vehiclesQuery.refetch()}
            />
          )}

          {!vehiclesQuery.isLoading && !vehiclesQuery.isError && vehicles.length === 0 && (
            <EmptyState
              icon={Car}
              title="Belum ada kendaraan"
              description="Tambahkan mobil atau motor kamu supaya booking berikutnya tinggal pilih."
              action={{ label: 'Tambah kendaraan', onClick: openAddVehicle }}
            />
          )}

          {!vehiclesQuery.isLoading && !vehiclesQuery.isError && vehicles.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {vehicles.map((v) => {
                const TypeIcon = v.vehicle_type === 'motor' ? Bike : Car;
                return (
                  <li
                    key={v.id}
                    className="flex flex-col rounded-[20px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex-1 space-y-4 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <Plate number={v.plate_number} size="lg" />
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                          <TypeIcon className="h-4 w-4" aria-hidden />
                          {v.vehicle_type === 'motor' ? 'Motor' : 'Mobil'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-[19px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white break-words">
                          {v.brand} {v.model}
                        </h3>
                        <p className="text-[15px] text-slate-600 dark:text-slate-400">Tahun {v.year}</p>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                            <Gauge className="h-3.5 w-3.5" aria-hidden />
                            Odometer
                          </dt>
                          <dd className="text-[15px] font-bold text-slate-900 dark:text-white">
                            {(v.last_odometer_km ?? 0).toLocaleString('id-ID')} km
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                            <Wrench className="h-3.5 w-3.5" aria-hidden />
                            Servis terakhir
                          </dt>
                          <dd className="text-[15px] font-bold text-slate-900 dark:text-white">
                            {v.last_service_date
                              ? formatDate(v.last_service_date, { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Belum ada'}
                          </dd>
                        </div>
                      </dl>
                      <div className="rounded-ctl bg-slate-50 p-4 dark:bg-slate-800/60">
                        <MaintenanceList vehicleId={v.id} />
                      </div>
                      <Link
                        href={`/booking/new?vehicle_id=${v.id}`}
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-ctl border border-primary-600 px-4 text-[15px] font-semibold text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-500 dark:text-primary-100 dark:hover:bg-primary-900/40"
                      >
                        <CalendarPlus className="h-4 w-4" aria-hidden />
                        Booking servis untuk {v.plate_number}
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => openEditVehicle(v)}
                        aria-label={`Ubah data kendaraan ${v.plate_number}`}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-bl-[20px] text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(v)}
                        aria-label={`Hapus kendaraan ${v.plate_number}`}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-br-[20px] border-l border-slate-200 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-slate-800 dark:text-red-300 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Hapus
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Dialog: ubah nama */}
      <Modal open={nameOpen} onClose={() => setNameOpen(false)} title="Ubah nama">
        <form onSubmit={submitName} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit_full_name" className={labelClass}>
              Nama lengkap
            </label>
            <input
              id="edit_full_name"
              type="text"
              autoComplete="name"
              value={fullNameInput}
              onChange={(e) => setFullNameInput(e.target.value)}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'edit_full_name-error' : undefined}
              className={clsx(inputClass, borderFor(nameError))}
            />
            {nameError && (
              <p id="edit_full_name-error" className={errorTextClass}>
                {nameError}
              </p>
            )}
          </div>
          <ModalActions>
            <button type="button" onClick={() => setNameOpen(false)} className={btnSecondary}>
              Batal
            </button>
            <button type="submit" disabled={updateProfileMutation.isPending} className={btnPrimary}>
              {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan nama'}
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* Dialog: ubah no. HP */}
      <Modal
        open={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        title={phone ? 'Ubah no. HP' : 'Isi no. HP'}
        description="Dipakai bengkel untuk konfirmasi booking dan kabar status servis."
      >
        <form onSubmit={submitPhone} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit_phone" className={labelClass}>
              No. HP (WhatsApp)
            </label>
            <input
              id="edit_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="08xxxxxxxxxx"
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? 'edit_phone-error' : undefined}
              className={clsx(inputClass, borderFor(phoneError))}
            />
            {phoneError && (
              <p id="edit_phone-error" className={errorTextClass}>
                {phoneError}
              </p>
            )}
          </div>
          <ModalActions>
            <button type="button" onClick={() => setPhoneOpen(false)} className={btnSecondary}>
              Batal
            </button>
            <button type="submit" disabled={updateProfileMutation.isPending} className={btnPrimary}>
              {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan no. HP'}
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* Dialog: ubah password (Supabase auth.updateUser) */}
      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Ubah password">
        <form onSubmit={handleChangePassword} noValidate className="space-y-4">
          {passwordError?.field === 'form' && (
            <p role="alert" className="rounded-ctl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {passwordError.message}
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="current_password" className={labelClass}>
              Password saat ini
            </label>
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              aria-invalid={passwordError?.field === 'current' ? true : undefined}
              aria-describedby={passwordError?.field === 'current' ? 'current_password-error' : undefined}
              className={clsx(inputClass, borderFor(passwordError?.field === 'current'))}
            />
            {passwordError?.field === 'current' && (
              <p id="current_password-error" className={errorTextClass}>
                {passwordError.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new_password" className={labelClass}>
              Password baru
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-invalid={passwordError?.field === 'new' ? true : undefined}
              aria-describedby="new_password-msg"
              className={clsx(inputClass, borderFor(passwordError?.field === 'new'))}
            />
            {passwordError?.field === 'new' ? (
              <p id="new_password-msg" className={errorTextClass}>
                {passwordError.message}
              </p>
            ) : (
              <p id="new_password-msg" className="text-[13px] text-slate-600 dark:text-slate-400">
                Minimal 6 karakter.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm_password" className={labelClass}>
              Ulangi password baru
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={passwordError?.field === 'confirm' ? true : undefined}
              aria-describedby={passwordError?.field === 'confirm' ? 'confirm_password-error' : undefined}
              className={clsx(inputClass, borderFor(passwordError?.field === 'confirm'))}
            />
            {passwordError?.field === 'confirm' && (
              <p id="confirm_password-error" className={errorTextClass}>
                {passwordError.message}
              </p>
            )}
          </div>
          <ModalActions>
            <button type="button" onClick={() => setPasswordOpen(false)} className={btnSecondary}>
              Batal
            </button>
            <button type="submit" disabled={passwordLoading} className={btnPrimary}>
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {passwordLoading ? 'Menyimpan...' : 'Simpan password'}
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* Dialog: tambah / ubah kendaraan */}
      <Modal
        open={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title={editVehicle ? 'Ubah data kendaraan' : 'Tambah kendaraan'}
      >
        <form
          onSubmit={handleVehicleSubmit((d) => saveVehicleMutation.mutate(d))}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="plate_number" className={labelClass}>
              Nomor polisi
            </label>
            <input
              id="plate_number"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="B 1234 XYZ"
              aria-invalid={vehicleErrors.plate_number ? true : undefined}
              aria-describedby={vehicleErrors.plate_number ? 'plate_number-error' : undefined}
              {...registerVehicle('plate_number')}
              className={clsx(inputClass, 'font-mono uppercase placeholder:font-sans placeholder:normal-case', borderFor(vehicleErrors.plate_number))}
            />
            {vehicleErrors.plate_number && (
              <p id="plate_number-error" className={errorTextClass}>
                {fieldMessage(vehicleErrors.plate_number, 'Nomor polisi wajib diisi.')}
              </p>
            )}
          </div>

          <fieldset className="space-y-1.5">
            <legend className={labelClass}>Jenis kendaraan</legend>
            <div className="grid grid-cols-2 gap-2 pt-1.5">
              {(
                [
                  { value: 'mobil', label: 'Mobil', icon: Car },
                  { value: 'motor', label: 'Motor', icon: Bike }
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-ctl border border-slate-300 px-3.5 text-[15px] font-medium text-slate-800 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50 has-[:checked]:text-primary-700 dark:border-slate-700 dark:text-slate-200 dark:has-[:checked]:border-primary-500 dark:has-[:checked]:bg-primary-900/40 dark:has-[:checked]:text-primary-100 transition-colors"
                >
                  <input type="radio" value={value} {...registerVehicle('vehicle_type')} className="h-4 w-4 accent-primary-600" />
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </label>
              ))}
            </div>
            {vehicleErrors.vehicle_type && (
              <p className={errorTextClass}>{fieldMessage(vehicleErrors.vehicle_type, 'Pilih jenis kendaraan.')}</p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="brand" className={labelClass}>
                Merek
              </label>
              <input
                id="brand"
                placeholder="Toyota, Honda"
                aria-invalid={vehicleErrors.brand ? true : undefined}
                aria-describedby={vehicleErrors.brand ? 'brand-error' : undefined}
                {...registerVehicle('brand')}
                className={clsx(inputClass, borderFor(vehicleErrors.brand))}
              />
              {vehicleErrors.brand && (
                <p id="brand-error" className={errorTextClass}>
                  {fieldMessage(vehicleErrors.brand, 'Merek wajib diisi.')}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="model" className={labelClass}>
                Model
              </label>
              <input
                id="model"
                placeholder="Avanza, Beat"
                aria-invalid={vehicleErrors.model ? true : undefined}
                aria-describedby={vehicleErrors.model ? 'model-error' : undefined}
                {...registerVehicle('model')}
                className={clsx(inputClass, borderFor(vehicleErrors.model))}
              />
              {vehicleErrors.model && (
                <p id="model-error" className={errorTextClass}>
                  {fieldMessage(vehicleErrors.model, 'Model wajib diisi.')}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="year" className={labelClass}>
                Tahun pembuatan
              </label>
              <input
                id="year"
                type="number"
                inputMode="numeric"
                aria-invalid={vehicleErrors.year ? true : undefined}
                aria-describedby={vehicleErrors.year ? 'year-error' : undefined}
                {...registerVehicle('year', { valueAsNumber: true })}
                className={clsx(inputClass, borderFor(vehicleErrors.year))}
              />
              {vehicleErrors.year && (
                <p id="year-error" className={errorTextClass}>
                  {fieldMessage(vehicleErrors.year, 'Isi tahun pembuatan, misalnya 2020.')}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="last_odometer_km" className={labelClass}>
                Odometer terakhir (km)
              </label>
              <input
                id="last_odometer_km"
                type="number"
                inputMode="numeric"
                min={0}
                aria-invalid={vehicleErrors.last_odometer_km ? true : undefined}
                aria-describedby={vehicleErrors.last_odometer_km ? 'last_odometer_km-error' : undefined}
                {...registerVehicle('last_odometer_km', { valueAsNumber: true })}
                className={clsx(inputClass, borderFor(vehicleErrors.last_odometer_km))}
              />
              {vehicleErrors.last_odometer_km && (
                <p id="last_odometer_km-error" className={errorTextClass}>
                  {fieldMessage(vehicleErrors.last_odometer_km, 'Isi angka km, atau 0 kalau belum tahu.')}
                </p>
              )}
            </div>
          </div>

          <ModalActions>
            <button type="button" onClick={() => setVehicleOpen(false)} className={btnSecondary}>
              Batal
            </button>
            <button type="submit" disabled={saveVehicleMutation.isPending} className={btnPrimary}>
              {saveVehicleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {saveVehicleMutation.isPending ? 'Menyimpan...' : editVehicle ? 'Simpan perubahan' : 'Tambah kendaraan'}
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* Dialog: konfirmasi hapus kendaraan */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus kendaraan?"
        description={
          deleteTarget && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Plate number={deleteTarget.plate_number} size="sm" />
              <span>
                {deleteTarget.brand} {deleteTarget.model} akan dihapus dari akun kamu.
              </span>
            </span>
          )
        }
      >
        <ModalActions>
          <button type="button" onClick={() => setDeleteTarget(null)} className={btnSecondary}>
            Batal
          </button>
          <button
            type="button"
            disabled={deleteVehicleMutation.isPending}
            onClick={() => deleteTarget && deleteVehicleMutation.mutate(deleteTarget.id)}
            className={btnDanger}
          >
            {deleteVehicleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {deleteVehicleMutation.isPending ? 'Menghapus...' : 'Ya, hapus'}
          </button>
        </ModalActions>
      </Modal>

      {/* Dialog: konfirmasi keluar */}
      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Keluar dari akun?"
        description="Kamu perlu masuk lagi untuk booking atau melihat riwayat servis."
      >
        <ModalActions>
          <button type="button" onClick={() => setLogoutOpen(false)} className={btnSecondary}>
            Batal
          </button>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className={btnDanger}>
            {loggingOut && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Keluar
          </button>
        </ModalActions>
      </Modal>
    </div>
  );
}
