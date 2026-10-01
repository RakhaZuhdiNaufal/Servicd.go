'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createVehicleSchema,
  type CreateVehicleInput
} from '@servicego/shared';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  Lock,
  Pencil,
  Trash2,
  Plus,
  LogOut,
  Calendar,
  CalendarCheck,
  Wallet,
  Clock,
  Check,
  Gauge,
  Fuel,
  ChevronRight,
  ArrowRight,
  MoreVertical,
  AlertTriangle,
  Car as CarIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

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

const formatRp = (v: number | string | null | undefined) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(v) || 0);

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Belum pernah servis';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Belum pernah servis';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/* Vector illustration for car */
function CarVector() {
  return (
    <svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-xs">
      <path
        d="M10 44C10 40 14 36 22 35L36 33L48 18C52 14 58 13 65 13H86C93 13 99 17 103 23L111 36C116 38 118 41 118 45V51C118 53 116 55 114 55H108C108 50 103 46 97 46C91 46 86 50 86 55H44C44 50 39 46 33 46C27 46 22 50 22 55H14C11.8 55 10 53.2 10 51V44Z"
        fill="#F1F5F9"
        stroke="#94A3B8"
        strokeWidth="1.5"
      />
      {/* Windows */}
      <path d="M50 18L39 32H62V16H54C52.5 16 51 16.8 50 18Z" fill="#38BDF8" fillOpacity="0.4" stroke="#64748B" strokeWidth="1" />
      <path d="M66 16V32H84L79 16H66Z" fill="#38BDF8" fillOpacity="0.4" stroke="#64748B" strokeWidth="1" />
      <path d="M88 18L97 32H88V18Z" fill="#38BDF8" fillOpacity="0.3" stroke="#64748B" strokeWidth="1" />
      {/* Wheels */}
      <circle cx="33" cy="55" r="9" fill="#1E293B" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="33" cy="55" r="4" fill="#94A3B8" />
      <circle cx="97" cy="55" r="9" fill="#1E293B" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="97" cy="55" r="4" fill="#94A3B8" />
      {/* Headlight */}
      <path d="M110 39L115 42L110 44V39Z" fill="#FBBF24" />
      {/* Character lines */}
      <line x1="36" y1="36" x2="98" y2="36" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* Vector illustration for motor */
function MotorVector() {
  return (
    <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-xs">
      {/* Front wheel */}
      <circle cx="24" cy="52" r="11" fill="#1E293B" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="24" cy="52" r="5" fill="#94A3B8" />
      {/* Back wheel */}
      <circle cx="78" cy="52" r="11" fill="#1E293B" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="78" cy="52" r="5" fill="#94A3B8" />
      {/* Frame & body */}
      <path
        d="M24 52L36 28L46 36L64 34L76 42L78 52"
        stroke="#475569"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fairing & seat */}
      <path
        d="M32 25C32 25 36 18 42 18H54C60 18 64 24 72 26L78 35H62L52 38L42 32L34 26"
        fill="#334155"
        stroke="#1E293B"
        strokeWidth="1.5"
      />
      {/* Handlebar */}
      <path d="M38 18L34 14H42" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      {/* Headlight */}
      <path d="M32 24L26 26" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
      {/* Exhaust */}
      <rect x="58" y="50" width="22" height="4" rx="2" fill="#64748B" />
    </svg>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Modals state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [deleteConfirmVehicle, setDeleteConfirmVehicle] = useState<Vehicle | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Edit vehicle state
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Queries
  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: () => fetcher<ProfileResponse>('/profile')
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher<Vehicle[]>('/vehicles')
  });

  // Vehicle form
  const {
    register: registerVehicle,
    handleSubmit: handleVehicleSubmit,
    reset: resetVehicleForm,
    formState: { errors: vehicleErrors }
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema)
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name?: string; phone?: string }) =>
      fetcher('/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast.success('Profil berhasil diperbarui');
      qc.invalidateQueries({ queryKey: ['profile'] });
      setProfileDialogOpen(false);
      setPhoneDialogOpen(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Gagal memperbarui profil');
    }
  });

  // Vehicle Save mutation
  const saveVehicleMutation = useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      editVehicle
        ? fetcher(`/vehicles/${editVehicle.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : fetcher('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(editVehicle ? 'Kendaraan berhasil diperbarui' : 'Kendaraan berhasil ditambahkan');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setVehicleDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal menyimpan kendaraan')
  });

  // Vehicle Delete mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/vehicles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Kendaraan berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteConfirmVehicle(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal menghapus kendaraan')
  });

  // Modal Openers
  function openEditName() {
    setFullNameInput(profileData?.profile?.full_name || user?.user_metadata?.full_name || '');
    setProfileDialogOpen(true);
  }

  function openEditPhone() {
    setPhoneInput(profileData?.profile?.phone || user?.user_metadata?.phone || '');
    setPhoneDialogOpen(true);
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
    setVehicleDialogOpen(true);
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
    setVehicleDialogOpen(true);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      toast.success('Password berhasil diperbarui');
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah password');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      toast.success('Berhasil keluar dari akun');
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  }

  const currentFullName = profileData?.profile?.full_name || user?.user_metadata?.full_name || 'Pelanggan';
  const currentEmail = profileData?.profile?.email || user?.email || '-';
  const currentPhone = profileData?.profile?.phone || user?.user_metadata?.phone || null;
  const initialLetter = (currentFullName || currentEmail || 'U')[0]?.toUpperCase();

  const stats = profileData?.stats ?? {
    total_bookings: 0,
    total_spent: 0,
    last_service_date: null
  };

  return (
    <div className="w-full space-y-7 pb-16">
      {/* ─────────────────────────────────────────────────────────────
          TOP ROW: 2 Cards Side-by-Side (Data Diri & Ringkasan Servis)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Card 1: Data Diri / Info Akun */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs">
          <div>
            {/* Top row: Avatar + Name & Info + Edit Name Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Avatar (Initial letter, rounded circle light blue) */}
                <div
                  aria-label={`Avatar ${currentFullName}`}
                  className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold text-2xl flex items-center justify-center shrink-0 select-none shadow-xs"
                >
                  {initialLetter}
                </div>

                {/* Name, Badge, Email, Phone */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {currentFullName}
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300">
                      Pengguna
                    </span>
                  </div>

                  {/* Email row */}
                  <div className="pt-0.5">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{currentEmail}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-5.5 mt-0.5">
                      Email tidak dapat diubah
                    </p>
                  </div>

                  {/* Phone row */}
                  <div className="pt-1">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-data">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{currentPhone || <span className="text-slate-400 italic font-sans font-normal">Belum diatur</span>}</span>
                    </div>

                    {/* Ubah Nomor HP Button */}
                    <button
                      type="button"
                      onClick={openEditPhone}
                      className="mt-2.5 ml-5.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs font-medium transition"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Ubah Nomor HP</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Name Button (top right) */}
              <button
                type="button"
                onClick={openEditName}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Bottom Bar: Ubah Password */}
          <button
            type="button"
            onClick={() => setPasswordDialogOpen(true)}
            className="mt-6 w-full flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
              <Lock className="h-4 w-4" />
              <span>Ubah Password</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Card 2: Ringkasan Servis */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs relative overflow-hidden">
          {/* Faint subtle watermark car illustration in top right */}
          <div className="absolute right-3 -top-1 pointer-events-none opacity-[0.08] dark:opacity-[0.05] text-blue-600">
            <svg width="130" height="90" viewBox="0 0 120 70" fill="currentColor">
              <path d="M10 44C10 40 14 36 22 35L36 33L48 18C52 14 58 13 65 13H86C93 13 99 17 103 23L111 36C116 38 118 41 118 45V51C118 53 116 55 114 55H108C108 50 103 46 97 46C91 46 86 50 86 55H44C44 50 39 46 33 46C27 46 22 50 22 55H14C11.8 55 10 53.2 10 51V44Z" />
              <path d="M5 25L25 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path d="M0 32L18 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <div>
            {/* Title */}
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ringkasan Servis
            </h2>

            {/* 3 Stats Side-by-Side */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 py-6">
              {/* Stat 1: Total Booking */}
              <div>
                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-data">
                  {profileLoading ? '...' : stats.total_bookings}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Total Booking
                </p>
              </div>

              {/* Stat 2: Total Pengeluaran */}
              <div>
                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-data truncate" title={formatRp(stats.total_spent)}>
                  {profileLoading ? '...' : formatRp(stats.total_spent)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Total Pengeluaran
                </p>
              </div>

              {/* Stat 3: Terakhir Servis */}
              <div>
                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={formatDate(stats.last_service_date)}>
                  {profileLoading ? '...' : formatDate(stats.last_service_date)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Terakhir Servis
                </p>
              </div>
            </div>
          </div>

          {/* Bottom link: Lihat riwayat lengkap */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <Link
              href="/bookings"
              className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 transition"
            >
              <span>Lihat riwayat lengkap</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM ROW: Kendaraan Saya (Section)
          ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="kendaraan-heading" className="space-y-4 pt-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="kendaraan-heading" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Kendaraan Saya
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola kendaraan Anda untuk memudahkan proses booking servis.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddVehicle}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-95 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kendaraan</span>
          </button>
        </div>

        {/* Vehicles Grid */}
        {vehiclesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 animate-pulse p-6" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* List of Vehicles */}
            {vehicles.map((v, index) => {
              const isFirst = index === 0;
              const isMotor = v.vehicle_type === 'motor';

              return (
                <div
                  key={v.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-5 relative flex flex-col justify-between transition ${
                    isFirst
                      ? 'border-2 border-blue-500 dark:border-blue-500 shadow-xs'
                      : 'border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Top-right check badge on active/primary vehicle */}
                  {isFirst && (
                    <div
                      title="Kendaraan Utama"
                      className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Top: Thumbnail & Details */}
                  <div className="flex items-start gap-3.5">
                    {/* Vehicle Vector Graphic Container */}
                    <div className="w-20 h-20 sm:w-24 sm:h-20 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-1.5 shrink-0">
                      {isMotor ? <MotorVector /> : <CarVector />}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Brand & Model + Utama badge */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                            {v.brand} {v.model}
                          </h3>
                          {isFirst && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              Utama
                            </span>
                          )}
                        </div>

                        <div className="text-slate-400">
                          <MoreVertical className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Plate Number */}
                      <p className="font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {v.plate_number}
                      </p>

                      {/* Year & Fuel */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {v.year}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Fuel className="h-3 w-3 text-slate-400" />
                          Bensin
                        </span>
                      </div>

                      {/* Odometer */}
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Gauge className="h-3 w-3 text-slate-400" />
                        <span>{v.last_odometer_km.toLocaleString('id-ID')} km</span>
                      </div>

                      {/* Service Status Badge */}
                      <div className="pt-1">
                        {v.last_service_date ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                            Terakhir servis: {formatDate(v.last_service_date)}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Belum pernah servis
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Edit & Hapus Buttons */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openEditVehicle(v)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmVehicle(v)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Dashed "Tambah Kendaraan" Card */}
            <div
              onClick={openAddVehicle}
              className="border-2 border-dashed border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2.5 transition min-h-[220px] cursor-pointer group"
            >
              <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CarIcon className="h-6 w-6" />
              </div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Tambah Kendaraan
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                Daftar kendaraan lain untuk memudahkan booking.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddVehicle();
                }}
                className="mt-1 w-full py-2 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold transition"
              >
                + Tambah Kendaraan
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: Keluar Akun
          ───────────────────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Masuk sebagai <strong className="font-medium text-slate-700 dark:text-slate-300">{currentEmail}</strong>
        </p>
        <button
          type="button"
          onClick={() => setLogoutDialogOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Keluar Akun</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: Edit Nama Lengkap
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Nama Lengkap</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!fullNameInput.trim()) {
                toast.error('Nama lengkap tidak boleh kosong');
                return;
              }
              updateProfileMutation.mutate({
                full_name: fullNameInput.trim()
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <label htmlFor="edit_full_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap
              </label>
              <input
                id="edit_full_name"
                type="text"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Masukkan nama lengkap Anda"
                required
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setProfileDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: Ubah Nomor HP
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Nomor WhatsApp / HP</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (phoneInput.trim().length > 0 && phoneInput.trim().length < 8) {
                toast.error('Nomor HP minimal 8 digit');
                return;
              }
              updateProfileMutation.mutate({
                phone: phoneInput.trim()
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <label htmlFor="edit_phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor Telepon / WhatsApp
              </label>
              <input
                id="edit_phone"
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-data text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <p className="text-[11px] text-slate-400">
                Digunakan untuk konfirmasi dan update status servis via WhatsApp / SMS.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setPhoneDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: Ubah Password
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-1">
              <label htmlFor="new_password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password Baru
              </label>
              <input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm_password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Konfirmasi Password Baru
              </label>
              <input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru Anda"
                required
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setPasswordDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
              >
                {passwordLoading ? 'Menyimpan...' : 'Perbarui Password'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: Tambah / Edit Kendaraan
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editVehicle ? 'Edit Kendaraan' : 'Tambah Kendaraan Baru'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleVehicleSubmit((d) => saveVehicleMutation.mutate(d))}
            className="space-y-4 py-2"
          >
            {/* Plat Nomor */}
            <div className="space-y-1">
              <label htmlFor="plate_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor Plat Polisi
              </label>
              <input
                id="plate_number"
                {...registerVehicle('plate_number')}
                placeholder="Contoh: B 1234 XYZ"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-mono font-bold uppercase text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {vehicleErrors.plate_number && (
                <p className="text-xs text-red-500 mt-1">{vehicleErrors.plate_number.message}</p>
              )}
            </div>

            {/* Merk & Model */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="brand" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Merk
                </label>
                <input
                  id="brand"
                  {...registerVehicle('brand')}
                  placeholder="Toyota / Honda"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {vehicleErrors.brand && (
                  <p className="text-xs text-red-500 mt-1">{vehicleErrors.brand.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="model" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Model / Seri
                </label>
                <input
                  id="model"
                  {...registerVehicle('model')}
                  placeholder="Avanza / Beat"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {vehicleErrors.model && (
                  <p className="text-xs text-red-500 mt-1">{vehicleErrors.model.message}</p>
                )}
              </div>
            </div>

            {/* Tahun & Tipe */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="year" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tahun Pembuatan
                </label>
                <input
                  id="year"
                  type="number"
                  {...registerVehicle('year', { valueAsNumber: true })}
                  placeholder="2022"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {vehicleErrors.year && (
                  <p className="text-xs text-red-500 mt-1">{vehicleErrors.year.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="vehicle_type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipe Kendaraan
                </label>
                <select
                  id="vehicle_type"
                  {...registerVehicle('vehicle_type')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="mobil">Mobil</option>
                  <option value="motor">Motor</option>
                </select>
                {vehicleErrors.vehicle_type && (
                  <p className="text-xs text-red-500 mt-1">{vehicleErrors.vehicle_type.message}</p>
                )}
              </div>
            </div>

            {/* Odometer */}
            <div className="space-y-1">
              <label htmlFor="last_odometer_km" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Odometer Terakhir (km)
              </label>
              <input
                id="last_odometer_km"
                type="number"
                {...registerVehicle('last_odometer_km', { valueAsNumber: true })}
                placeholder="Contoh: 15000"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-data text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {vehicleErrors.last_odometer_km && (
                <p className="text-xs text-red-500 mt-1">{vehicleErrors.last_odometer_km.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setVehicleDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saveVehicleMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
              >
                {saveVehicleMutation.isPending ? 'Menyimpan...' : 'Simpan Kendaraan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: Konfirmasi Hapus Kendaraan
          ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteConfirmVehicle)}
        onOpenChange={(open) => !open && setDeleteConfirmVehicle(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Hapus Kendaraan</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin menghapus kendaraan{' '}
            <strong className="font-mono text-slate-900 dark:text-white">
              {deleteConfirmVehicle?.plate_number}
            </strong>{' '}
            ({deleteConfirmVehicle?.brand} {deleteConfirmVehicle?.model})? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmVehicle(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={deleteVehicleMutation.isPending}
              onClick={() => deleteConfirmVehicle && deleteVehicleMutation.mutate(deleteConfirmVehicle.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 transition disabled:opacity-50"
            >
              {deleteVehicleMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 6: Konfirmasi Logout
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <LogOut className="h-5 w-5 text-red-600" />
              <span>Konfirmasi Keluar</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300 py-2">
            Apakah Anda yakin ingin keluar dari akun ServiceGo Anda?
          </p>
          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setLogoutDialogOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 transition"
            >
              Keluar Sekarang
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
