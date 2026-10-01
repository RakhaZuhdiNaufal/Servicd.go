'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car, Calendar, Clock, ChevronRight, ArrowRight, Wrench,
  Star, MapPin, Sparkles, ShieldCheck, AlertCircle,
  PhoneCall, MessageSquare, Droplets, Gauge, Zap,
  CheckCircle2, Search, Tag, Info, ArrowUpRight, Compass
} from 'lucide-react';
import { BranchMapModal } from '@/components/customer/branch-map-modal';
import { MiniMapPreview } from '@/components/customer/mini-map-preview';

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_type: string;
  last_odometer_km?: number;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface Booking {
  id: string;
  status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
  scheduled_at: string;
  estimated_cost: number;
  vehicle: { plate_number: string; brand: string; model: string };
  booking_services: Array<{ service: { name: string } }>;
  branch?: { name: string } | null;
}

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function BerandaPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Search widget state
  const [activeTab, setActiveTab] = useState<'servis' | 'cek'>('servis');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('Semua Cabang');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [checkBookingCode, setCheckBookingCode] = useState<string>('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapInitialBranch, setMapInitialBranch] = useState<string | undefined>(undefined);

  // Queries
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher('/vehicles'),
    enabled: !!user
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => fetcher('/bookings'),
    enabled: !!user
  });

  const activeBooking = allBookings.find(b => b.status === 'menunggu' || b.status === 'diproses');
  const lastFinishedBooking = allBookings.find(b => b.status === 'selesai');

  // Handle Quick Search submit
  function handleSearchSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (activeTab === 'cek') {
      if (checkBookingCode.trim()) {
        router.push(`/bookings`);
      }
      return;
    }
    const params = new URLSearchParams();
    if (selectedVehicle) params.set('vehicle_id', selectedVehicle);
    if (selectedService) params.set('service_id', selectedService);
    router.push(`/booking/new?${params.toString()}`);
  }

  // Predefined service icons & fallbacks
  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('oli')) return Droplets;
    if (n.includes('rem')) return AlertCircle;
    if (n.includes('listrik') || n.includes('aki')) return Zap;
    if (n.includes('spooring') || n.includes('balancing')) return Gauge;
    if (n.includes('tune') || n.includes('mesin')) return Wrench;
    return Sparkles;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION WITH SEARCH WIDGET (NO GIANT STOCK PHOTO)           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Title & Subtitle */}
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/80 border border-primary-200/60 dark:border-primary-800 text-xs font-semibold text-primary-700 dark:text-primary-300">
              <Sparkles className="h-3.5 w-3.5 text-primary-600" />
              <span>Platform Booking Bengkel Terpercaya #1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Servis kendaraan <span className="text-primary-600">tanpa ribet.</span>
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Pilih kendaraan, layanan, bengkel, lalu tentukan waktu yang paling pas. Transparan, bergaransi, dan pantau progres langsung secara realtime.
            </p>
          </div>

          {/* Right: Modern Feature Summary Card (Replaces the AI-slop car photo) */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-primary-50/30 to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-primary-950/30 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-sm shadow-primary-600/30">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Standar Layanan</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">ServiceGo Guarantee</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                  Resmi & Terverifikasi
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 space-y-0.5">
                  <span className="text-slate-400 font-medium text-[11px]">Garansi Servis</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">14 Hari Penuh</p>
                  <p className="text-[11px] text-slate-500">Jaminan perbaikan ulang</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 space-y-0.5">
                  <span className="text-slate-400 font-medium text-[11px]">Suku Cadang</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">100% Orisinal</p>
                  <p className="text-[11px] text-slate-500">Langsung dari distributor</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <strong className="text-slate-800 dark:text-slate-200">4.9/5</strong> · 3.500+ review
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-primary-600" />
                  <span>SLA 98%</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Booking / Search Filter Widget (Matching Reference Design) ── */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 space-y-3">
          {/* Tabs */}
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('servis')}
              className={`flex items-center gap-2 pb-2 text-sm font-semibold transition border-b-2 -mb-3.5 ${
                activeTab === 'servis'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Wrench className="h-4 w-4" />
              <span>Servis Kendaraan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cek')}
              className={`flex items-center gap-2 pb-2 text-sm font-semibold transition border-b-2 -mb-3.5 ${
                activeTab === 'cek'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Cek Booking</span>
            </button>
          </div>

          {/* Form Fields */}
          {activeTab === 'servis' ? (
            <form onSubmit={handleSearchSchedule} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Kendaraan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-slate-400" />
                    <span>Kendaraan</span>
                  </label>
                  <select
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">
                      {vehicles.length > 0 ? 'Pilih kendaraan Anda' : 'Pilih tipe kendaraan'}
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} ({v.plate_number})
                      </option>
                    ))}
                    {vehicles.length === 0 && (
                      <>
                        <option value="mobil-umum">Mobil (Umum)</option>
                        <option value="motor-umum">Motor (Umum)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Jenis Servis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-slate-400" />
                    <span>Jenis Servis</span>
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih jenis servis</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatRp(s.price)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lokasi Bengkel */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Lokasi Bengkel</span>
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Semua Cabang">Semua Cabang Terdekat (5 Cabang)</option>
                    <option value="ServiceGo Margonda Depok">ServiceGo Margonda (Depok)</option>
                    <option value="ServiceGo Cinere Depok">ServiceGo Cinere (Depok)</option>
                    <option value="ServiceGo Pajajaran Bogor">ServiceGo Pajajaran (Bogor)</option>
                    <option value="ServiceGo Kebon Jeruk Jakarta">ServiceGo Kebon Jeruk (Jakarta Barat)</option>
                    <option value="ServiceGo Fatmawati Jakarta">ServiceGo Fatmawati (Jakarta Selatan)</option>
                  </select>
                </div>

                {/* Tanggal & Jam */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Tanggal & Jam</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 text-sm flex items-center gap-1.5 shadow-sm shadow-primary-600/25 transition active:scale-95"
                    >
                      <Search className="h-4 w-4" />
                      <span className="hidden sm:inline">Cari</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent searches bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                <span className="text-slate-400 font-medium">Pencarian terakhir:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (services[0]) setSelectedService(services[0].id);
                  }}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 px-2.5 py-1 text-slate-600 dark:text-slate-300 transition"
                >
                  Ganti Oli + Filter · Depok
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (services[2]) setSelectedService(services[2].id);
                  }}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 px-2.5 py-1 text-slate-600 dark:text-slate-300 transition"
                >
                  Servis Rem & Flushing Minyak
                </button>
              </div>
            </form>
          ) : (
            /* Cek Booking Code Form */
            <div className="flex flex-col sm:flex-row gap-3 py-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan Nomor Plat Kendaraan atau ID Booking..."
                  value={checkBookingCode}
                  onChange={(e) => setCheckBookingCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Link
                href="/bookings"
                className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 text-sm flex items-center justify-center gap-2 transition"
              >
                <span>Cek Status</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. 4 STAT/SUMMARY CARDS (Directly below Hero - Reference Match)     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Booking Aktif */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 hover:shadow-sm transition group">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-primary-600 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">Booking aktif</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {activeBooking
                    ? activeBooking.booking_services.map(s => s.service.name).join(', ')
                    : 'Tidak ada booking aktif'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-500">
                {activeBooking
                  ? new Date(activeBooking.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                  : 'Siap untuk booking baru'}
              </span>
              <Link
                href={activeBooking ? `/bookings/${activeBooking.id}` : '/booking/new'}
                className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                <span>{activeBooking ? 'Lihat detail' : 'Booking'}</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Kendaraan Saya */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 hover:shadow-sm transition group">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center shrink-0">
                <Car className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">Kendaraan saya</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {vehicles.length > 0 ? `${vehicles.length} Kendaraan` : 'Belum terdaftar'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-500 truncate max-w-[150px]">
                {vehicles.length > 0 ? vehicles.map(v => v.model).join(', ') : 'Tambahkan data mobil/motor'}
              </span>
              <Link
                href="/profile"
                className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-0.5 shrink-0"
              >
                <span>Lihat semua</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Servis Terakhir */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 hover:shadow-sm transition group">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-600 flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">Servis terakhir</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {lastFinishedBooking
                    ? lastFinishedBooking.booking_services.map(s => s.service.name).join(', ')
                    : 'Ganti Oli + Filter'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-500">
                {lastFinishedBooking
                  ? new Date(lastFinishedBooking.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '12 Agu 2025'}
              </span>
              <Link
                href="/bookings"
                className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                <span>Lihat riwayat</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 4: Poin ServiceGo */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 hover:shadow-sm transition group">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">Poin ServiceGo</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  320 poin
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-500">Nilai diskon Rp 32.000</span>
              <Link
                href="/booking/new"
                className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                <span>Tukarkan poin</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. LAYANAN YANG SERING DIPILIH (6 Responsive Cards Grid)            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Layanan yang sering dipilih
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Pilihan servis rutin terpopuler dengan durasi cepat</p>
          </div>
          <Link
            href="/booking/new"
            className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-0.5 shrink-0"
          >
            <span>Lihat semua</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Agoda-style horizontal scroll: more items visible at wider viewports */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-0">
          {services.slice(0, 6).map((service) => {
            const Icon = getServiceIcon(service.name);
            return (
              <Link
                key={service.id}
                href={`/booking/new?service_id=${service.id}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col justify-between gap-3 hover:border-primary-400 hover:shadow-md hover:-translate-y-0.5 transition duration-200 group shrink-0 w-[160px]"
              >
                <div className="space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug group-hover:text-primary-600 transition line-clamp-2">
                      {service.name}
                    </h3>
                    <p className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400 mt-1">
                      {formatRp(service.price)}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{service.duration_minutes} mnt</span>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-primary-600 group-hover:text-primary-700">
                  Pilih →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. BENGKEL DI SEKITAR KAMU (3 Cards + Mini Radar Map)               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Bengkel di sekitar kamu
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Jaringan 5 cabang bengkel resmi di Depok, Bogor, dan Jakarta</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMapInitialBranch(undefined);
              setIsMapModalOpen(true);
            }}
            className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>Lihat semua di peta</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Workshop 1: Depok Margonda */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-primary-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            {/* Top Workshop Photo (Clean without overlays) */}
            <div className="relative h-[120px] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
              <img
                src="/images/branches/depok-margonda.jpg"
                alt="ServiceGo Margonda Depok"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>

            {/* Card Content Body */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                    Cabang Depok
                  </span>
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>4.8 (1.2rb)</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary-600 transition-colors">
                    ServiceGo Margonda Depok
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>1.2 km · Jl. Margonda Raya No. 45, Depok</span>
                  </p>
                </div>

                <p className="text-xs text-slate-500 font-medium">Ganti Oli · Rem · Tune-up · AC Mobil</p>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Jam tersedia hari ini:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['09:00', '10:00', '13:00', '15:00'].map((slot) => (
                    <Link
                      key={slot}
                      href="/booking/new?branch_id=branch-depok-1"
                      className="text-[11px] font-mono px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 transition"
                    >
                      {slot}
                    </Link>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMapInitialBranch('branch-depok-1');
                  setIsMapModalOpen(true);
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold inline-flex items-center gap-1 pt-1"
              >
                <span>Lihat di peta & detail</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Workshop 2: Depok Cinere */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-primary-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            {/* Top Workshop Photo (Clean without overlays) */}
            <div className="relative h-[120px] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
              <img
                src="/images/branches/depok-cinere.jpg"
                alt="ServiceGo Cinere Depok"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>

            {/* Card Content Body */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full">
                    Cabang Depok
                  </span>
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>4.8 (892)</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary-600 transition-colors">
                    ServiceGo Cinere Depok
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>2.8 km · Jl. Cinere Raya No. 12, Depok</span>
                  </p>
                </div>

                <p className="text-xs text-slate-500 font-medium">Kelistrikan · Tune-up · AC · Spooring</p>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Jam tersedia hari ini:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['09:00', '11:00', '14:00', '16:00'].map((slot) => (
                    <Link
                      key={slot}
                      href="/booking/new?branch_id=branch-depok-2"
                      className="text-[11px] font-mono px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 transition"
                    >
                      {slot}
                    </Link>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMapInitialBranch('branch-depok-2');
                  setIsMapModalOpen(true);
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold inline-flex items-center gap-1 pt-1"
              >
                <span>Lihat di peta & detail</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Workshop 3: Bogor Pajajaran */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-primary-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            {/* Top Workshop Photo (Clean without overlays) */}
            <div className="relative h-[120px] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
              <img
                src="/images/branches/bogor-pajajaran.jpeg"
                alt="ServiceGo Pajajaran Bogor"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>

            {/* Card Content Body */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                    Cabang Bogor
                  </span>
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>4.9 (640)</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary-600 transition-colors">
                    ServiceGo Pajajaran Bogor
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>18 km · Jl. Raya Pajajaran No. 28, Bogor</span>
                  </p>
                </div>

                <p className="text-xs text-slate-500 font-medium">Servis Berkala · Radiator · Kaki-kaki · Oli</p>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Jam tersedia hari ini:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['08:00', '10:00', '13:00', '16:00'].map((slot) => (
                    <Link
                      key={slot}
                      href="/booking/new?branch_id=branch-bogor-1"
                      className="text-[11px] font-mono px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 transition"
                    >
                      {slot}
                    </Link>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMapInitialBranch('branch-bogor-1');
                  setIsMapModalOpen(true);
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold inline-flex items-center gap-1 pt-1"
              >
                <span>Lihat di peta & detail</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 4: Radar / Mini Location Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-3 flex flex-col justify-between space-y-2 h-full hover:border-primary-300 hover:shadow-md transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  <span>Jabodetabek</span>
                </span>
                <span className="text-[11px] text-primary-600 font-semibold bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded-full">
                  5 Titik Lokasi
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tersedia 5 cabang resmi ServiceGo: Depok (2), Bogor (1), dan Jakarta (2).
              </p>
            </div>

            {/* Live Interactive Map Preview */}
            <div className="flex-1 my-1 flex items-center justify-center">
              <MiniMapPreview
                onOpenFullMap={() => {
                  setMapInitialBranch(undefined);
                  setIsMapModalOpen(true);
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setMapInitialBranch(undefined);
                setIsMapModalOpen(true);
              }}
              className="w-full text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold py-2.5 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Cari Berdasarkan Peta</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. REPLACED: PENGINGAT SERVIS & KESEHATAN KENDARAAN                 */}
      {/* (Replaces "Perjalanan Servis" as instructed — useful for users!)     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Kesehatan & Jadwal Perawatan Kendaraan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau jadwal servis berkala agar performa kendaraan selalu prima
            </p>
          </div>
          <Link
            href="/profile"
            className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>Kelola Kendaraan</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary-50 dark:bg-primary-950/80 text-primary-600 flex items-center justify-center">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {vehicles[0] ? `${vehicles[0].brand} ${vehicles[0].model}` : 'Honda HR-V 1.5 SE'}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {vehicles[0]?.plate_number ?? 'B 1234 SG'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Odometer saat ini: <strong className="text-slate-700 dark:text-slate-300">24.500 km</strong> · Servis terakhir: 12 Agu 2025
                </p>
              </div>
            </div>

            <Link
              href="/booking/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-xs px-4 py-2.5 shadow-sm shadow-accent-500/25 transition active:scale-95 shrink-0"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Jadwalkan Servis Berkala</span>
            </Link>
          </div>

          {/* 4 Health Status Check Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl border border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-amber-600" />
                  <span>Oli Mesin</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Perlu Cek
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Disarankan ganti dalam <strong>1.200 km</strong> lagi (~14 hari).
              </p>
            </div>

            <div className="p-3 rounded-xl border border-green-200/70 bg-green-50/40 dark:border-green-900/40 dark:bg-green-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Sistem Rem</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Baik
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ketebalan kampas 75%. Minyak rem jernih.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-green-200/70 bg-green-50/40 dark:border-green-900/40 dark:bg-green-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span>Aki & Kelistrikan</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Normal
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Tegangan aki 12.6V. Alternator mengisi optimal.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-primary-600" />
                  <span>Spooring & Ban</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  Rutin
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Jadwal rotasi & balancing setiap 10.000 km.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. PAKET SERVIS & PROMO (3 Cards with Discount Pricing)             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Paket Servis & Promo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Solusi bundling hemat untuk servis menyeluruh kendaraan Anda</p>
          </div>
          <Link
            href="/booking/new"
            className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>Lihat semua paket</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Promo 1 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between space-y-3 hover:border-primary-400 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 px-2.5 py-1 rounded-full">
                  Paket Hemat
                </span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-md">
                  Hemat Rp 60.000
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Paket Ganti Oli + Filter Baru
                </h3>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                    Rp 320.000
                  </span>
                  <span className="font-mono text-xs text-slate-400 line-through">
                    Rp 380.000
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Oli mesin full synthetic 4L + filter oli original + gratis general checkup 15 titik vital kendaraan.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 60 menit</span>
                <span>·</span>
                <span>Semua tipe mobil</span>
              </div>
            </div>
            <Link
              href="/booking/new"
              className="w-full text-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs py-2.5 transition shadow-sm"
            >
              Ambil Paket Promo
            </Link>
          </div>

          {/* Promo 2 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between space-y-3 hover:border-primary-400 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-full">
                  Paket Lengkap
                </span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-md">
                  Hemat Rp 100.000
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Paket Servis Rem + Cek Kelistrikan
                </h3>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                    Rp 420.000
                  </span>
                  <span className="font-mono text-xs text-slate-400 line-through">
                    Rp 520.000
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Pembersihan 4 rem cakram + flushing minyak rem DOT4 + scanner diagnosis kelistrikan OBD2 + uji beban aki.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 60 menit</span>
                <span>·</span>
                <span>Semua tipe mobil</span>
              </div>
            </div>
            <Link
              href="/booking/new"
              className="w-full text-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs py-2.5 transition shadow-sm"
            >
              Ambil Paket Promo
            </Link>
          </div>

          {/* Promo 3 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between space-y-3 hover:border-primary-400 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-2.5 py-1 rounded-full">
                  Paket AC Segar
                </span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-md">
                  Hemat Rp 70.000
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Paket Refresh AC Mobil & Sanitasi
                </h3>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                    Rp 350.000
                  </span>
                  <span className="font-mono text-xs text-slate-400 line-through">
                    Rp 420.000
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Pembersihan blower & evaporator tanpa bongkar + cek tekanan freon R134a + fogging antibakteri kabin.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 60 menit</span>
                <span>·</span>
                <span>Semua tipe mobil</span>
              </div>
            </div>
            <Link
              href="/booking/new"
              className="w-full text-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs py-2.5 transition shadow-sm"
            >
              Ambil Paket Promo
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. REPLACED: BANTUAN CEPAT & TIPS MEKANIK (NO AI-SLOP MARKETING)    */}
      {/* (Replaces "Kenapa ServiceGo" & FAQ with high-utility actions)       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Layanan Cepat & Bantuan Darurat
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Solusi cepat untuk kendala kendaraan Anda kapan saja saat dibutuhkan
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 transition">
            <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/80 text-red-600 flex items-center justify-center">
              <PhoneCall className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Bantuan Darurat 24 Jam</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mogok mendadak, aki soak, atau ban bocor? Panggil derek dan teknisi darurat ke lokasi Anda.
            </p>
            <a
              href="tel:080012345678"
              className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold hover:underline pt-1"
            >
              <span>Hubungi Derek</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 transition">
            <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-950/80 text-green-600 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tanya Mekanik via WhatsApp</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Konsultasikan gejala bunyi aneh atau kendala mesin langsung dengan tim kepala mekanik kami.
            </p>
            <a
              href="https://wa.me/628123456789"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold hover:underline pt-1"
            >
              <span>Chat WhatsApp</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 transition">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-primary-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Klaim Garansi Servis</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Jika kendaraan bermasalah pasca-servis dalam 14 hari, pengerjaan ulang 100% bebas biaya.
            </p>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline pt-1"
            >
              <span>Cek Status Garansi</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Card 4 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 hover:border-primary-300 transition">
            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
              <Info className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Estimasi Biaya Transparan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dapatkan rincian biaya pasti tanpa mark-up tersembunyi sebelum pengerjaan dimulai.
            </p>
            <Link
              href="/booking/new"
              className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold hover:underline pt-1"
            >
              <span>Simulasi Biaya</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. BOTTOM CTA BANNER (Clean & Professional)                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section>
        <div className="rounded-xl bg-gradient-to-r from-primary-700 via-primary-600 to-blue-600 p-5 sm:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md shadow-primary-700/20">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-primary-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>ServiceGo Booking Online</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">
              Servis kendaraan sekarang, lebih mudah dengan ServiceGo
            </h3>
            <p className="text-sm text-primary-100 max-w-xl leading-relaxed">
              Dapatkan pengalaman servis yang cepat, transparan, dan terpercaya langsung dari ponsel Anda.
            </p>
          </div>

          <Link
            href="/booking/new"
            className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm px-6 py-3 shadow-lg shadow-orange-500/30 transition transform active:scale-95 flex items-center gap-2"
          >
            <span>Booking Sekarang</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Real Interactive Leaflet OpenStreetMap Modal */}
      <BranchMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialBranchId={mapInitialBranch}
      />
    </div>
  );
}
