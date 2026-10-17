'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Vehicle, Service, Branch, AvailableSlotsResponse, BookingStep, BookingStepKey, PromoInfo } from './types';
import { serviceIdsFromQuery, validServiceIds } from './query-params';

/** Tanggal lokal (zona perangkat) dalam format YYYY-MM-DD, `offsetDays` hari dari sekarang. */
export function localDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * State dan aksi form booking.
 *
 * Query param yang didukung (untuk link dari Beranda / detail layanan):
 * - `service_id`, `service`, atau `services`: pre-select satu atau beberapa layanan
 *   (`?service_id=a&service_id=b` atau `?service_id=a,b`); ID yang tidak dikenal diabaikan
 * - `vehicle_id`: pre-select kendaraan (setelah login)
 * - `branch_id`: pre-select bengkel (bila hanya ada satu bengkel, otomatis terpilih)
 * - `promo`: isi otomatis kode promo (divalidasi ke daftar /promos)
 *
 * Hook ini memakai useSearchParams, jadi komponen pemanggilnya harus dibungkus <Suspense>.
 */
export function useBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const queryServiceIds = serviceIdsFromQuery(searchParams);
  const queryServiceKey = queryServiceIds.join(',');
  const queryVehicleId = searchParams.get('vehicle_id');
  const queryBranchId = searchParams.get('branch_id');
  const queryPromo = searchParams.get('promo');

  // Link masuk yang membawa pengguna kembali ke form ini dengan pilihan dari URL.
  const currentQuery = searchParams.toString();
  const returnPath = `/booking/new${currentQuery ? `?${currentQuery}` : ''}`;
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`;

  // Pilihan form, semuanya mulai kosong (tidak ada nilai contoh/hardcode).
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [complaintNotes, setComplaintNotes] = useState<string>('');
  const [promoInput, setPromoInput] = useState<string>(queryPromo ?? '');
  const [appliedPromo, setAppliedPromo] = useState<PromoInfo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Tanggal default: besok (servis paling cepat H+1, sama dengan batas `min` di input tanggal).
  useEffect(() => {
    setSelectedDate(localDateString(1));
  }, []);

  // Kendaraan hanya diambil saat sudah login.
  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher('/vehicles'),
    enabled: !!user
  });

  const servicesQuery = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  const branchesQuery = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => fetcher('/branches')
  });

  // Daftar promo aktif (sumber sama dengan validasi di server).
  const promosQuery = useQuery<PromoInfo[]>({
    queryKey: ['promos'],
    queryFn: () => fetcher('/promos')
  });

  const vehicles = vehiclesQuery.data ?? [];
  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const branches = branchesQuery.data ?? [];

  const activeServicesList = services.filter((s) => selectedServices.includes(s.id));
  const totalCost = activeServicesList.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalDuration = activeServicesList.reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
  // Rumus sama dengan server (promoDiscount di packages/shared): persen dari estimasi, dibulatkan ke rupiah.
  const promoDiscount = appliedPromo ? Math.round((totalCost * appliedPromo.discount_percent) / 100) : 0;
  const finalCost = totalCost - promoDiscount;

  function applyPromo(code: string = promoInput) {
    const normalized = code.trim().toUpperCase();
    setPromoInput(normalized);
    if (!normalized) {
      setPromoError('Isi kode promo dulu.');
      return;
    }
    if (promosQuery.isError) {
      setPromoError('Daftar promo belum bisa dimuat. Coba lagi sebentar lagi.');
      return;
    }
    const promo = (promosQuery.data ?? []).find((p) => p.code === normalized && p.is_active);
    if (!promo) {
      setAppliedPromo(null);
      setPromoError('Kode promo tidak dikenal atau sudah tidak berlaku.');
      return;
    }
    setAppliedPromo(promo);
    setPromoError(null);
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  }

  // Kode dari URL (?promo=) dipakai otomatis begitu daftar promo selesai dimuat.
  useEffect(() => {
    if (queryPromo && promosQuery.data) applyPromo(queryPromo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promosQuery.data, queryPromo]);

  // Slot jam untuk bengkel & tanggal terpilih. Durasi total dikirim supaya cek bentrok
  // memakai jendela waktu yang sama dengan validasi di POST /bookings.
  const slotsQuery = useQuery<AvailableSlotsResponse>({
    queryKey: ['available-slots', selectedDate, selectedBranch, totalDuration],
    queryFn: () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedBranch) params.set('branch_id', selectedBranch);
      if (totalDuration > 0) params.set('duration_minutes', String(Math.max(30, totalDuration)));
      return fetcher(`/bookings/available-slots?${params.toString()}`);
    },
    enabled: !!selectedDate && !!selectedBranch
  });

  const slotsData = slotsQuery.data;
  const allSlots = useMemo(() => slotsData?.slots ?? [], [slotsData]);
  const availableSlots = useMemo(() => allSlots.filter((s) => s.is_available), [allSlots]);

  // Pre-select dari URL.
  useEffect(() => {
    if (queryVehicleId && vehicles.some((v) => v.id === queryVehicleId)) {
      setSelectedVehicle(queryVehicleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiclesQuery.data, queryVehicleId]);

  // Semua layanan dari URL yang valid ikut terpilih; ID yang tidak dikenal diabaikan.
  useEffect(() => {
    const valid = validServiceIds(queryServiceIds, services);
    if (valid.length === 0) return;
    setSelectedServices((prev) => {
      const missing = valid.filter((id) => !prev.includes(id));
      return missing.length ? [...prev, ...missing] : prev;
    });
    // queryServiceKey mewakili queryServiceIds (array baru di setiap render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, queryServiceKey]);

  // Hanya satu bengkel: langsung terpilih, langkah "Bengkel" dilewati.
  const singleBranch = branches.length === 1;

  useEffect(() => {
    if (queryBranchId && branches.some((b) => b.id === queryBranchId)) {
      setSelectedBranch(queryBranchId);
    } else if (branches.length === 1) {
      setSelectedBranch(branches[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchesQuery.data, queryBranchId]);

  // Jam yang sudah dipilih dikosongkan lagi kalau tidak tersedia di data slot terbaru.
  useEffect(() => {
    if (selectedTime && !slotsQuery.isFetching && !availableSlots.some((s) => s.time === selectedTime)) {
      setSelectedTime('');
    }
  }, [availableSlots, selectedTime, slotsQuery.isFetching]);

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicle) ?? null;
  const activeBranch = branches.find((b) => b.id === selectedBranch) ?? null;

  const handleSelectVehicle = (id: string) => setSelectedVehicle((prev) => (prev === id ? '' : id));
  const handleSelectBranch = (id: string) => {
    if (singleBranch) return; // satu-satunya bengkel tidak bisa dibatalkan
    setSelectedBranch((prev) => (prev === id ? '' : id));
  };
  const toggleService = (id: string) =>
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const hasVehicle = !!selectedVehicle;
  const hasServices = selectedServices.length > 0;
  const hasBranch = !!selectedBranch;
  const hasSchedule = !!selectedDate && !!selectedTime && availableSlots.length > 0;

  const allSteps: Array<Omit<BookingStep, 'number'>> = [
    { key: 'kendaraan', label: 'Kendaraan', done: hasVehicle },
    { key: 'layanan', label: 'Layanan', done: hasServices },
    { key: 'bengkel', label: 'Bengkel', done: hasBranch },
    { key: 'jadwal', label: 'Jadwal', done: hasSchedule }
  ];
  const steps: BookingStep[] = allSteps
    .filter((step) => !(singleBranch && step.key === 'bengkel'))
    .map((step, i) => ({ ...step, number: i + 1 }));
  const scheduleStepNumber = steps.find((s) => s.key === 'jadwal')!.number;
  // Langkah aktif = langkah pertama yang belum lengkap; null berarti siap dikonfirmasi.
  const activeStep: BookingStepKey | null = steps.find((s) => !s.done)?.key ?? null;

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.info('Masuk dulu untuk menyelesaikan booking.');
        router.push(loginHref);
        return null;
      }
      if (!selectedVehicle) throw new Error('Pilih kendaraan yang akan diservis.');
      if (selectedServices.length === 0) throw new Error('Pilih minimal satu layanan.');
      if (!selectedBranch) throw new Error('Pilih bengkel tujuan.');
      if (!selectedDate || !selectedTime) throw new Error('Tentukan tanggal dan jam kedatangan.');

      // Jam slot adalah jam WIB, jadi digabung dengan offset +07:00 lalu dikirim sebagai ISO.
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00+07:00`).toISOString();

      return fetcher<{ id: string }>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          vehicle_id: selectedVehicle,
          service_ids: selectedServices,
          branch_id: selectedBranch,
          scheduled_at: scheduledDateTime,
          complaint_notes: complaintNotes.trim() || null,
          promo_code: appliedPromo?.code ?? null
        })
      });
    },
    onSuccess: (data) => {
      if (!data) return;
      toast.success('Booking berhasil dibuat.');
      router.replace(`/bookings/${data.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Booking belum berhasil dibuat. Coba lagi.');
    }
  });

  const isSubmitDisabled =
    bookMutation.isPending ||
    !hasVehicle ||
    !hasServices ||
    !hasBranch ||
    !hasSchedule ||
    slotsQuery.isLoading ||
    slotsQuery.isError;

  // Alasan tombol konfirmasi belum aktif, ditampilkan di dekat tombol.
  const missingHint: string | null = authLoading
    ? null
    : !user
    ? 'Perlu masuk akun dulu.'
    : !hasVehicle
    ? 'Pilih kendaraan dulu.'
    : !hasServices
    ? 'Pilih minimal satu layanan.'
    : !hasBranch
    ? 'Pilih bengkel tujuan.'
    : !selectedTime
    ? 'Pilih jam kedatangan.'
    : null;

  return {
    user,
    authLoading,
    loginHref,
    // Pilihan
    selectedVehicle,
    setSelectedVehicle: handleSelectVehicle,
    selectedServices,
    toggleService,
    selectedBranch,
    setSelectedBranch: handleSelectBranch,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    complaintNotes,
    setComplaintNotes,
    // Data
    vehicles,
    vLoading: vehiclesQuery.isLoading,
    vError: vehiclesQuery.isError,
    refetchVehicles: vehiclesQuery.refetch,
    services,
    sLoading: servicesQuery.isLoading,
    sError: servicesQuery.isError,
    refetchServices: servicesQuery.refetch,
    branches,
    bLoading: branchesQuery.isLoading,
    bError: branchesQuery.isError,
    refetchBranches: branchesQuery.refetch,
    slotsData,
    allSlots,
    slotsLoading: slotsQuery.isLoading,
    slotsError: slotsQuery.isError,
    refetchSlots: slotsQuery.refetch,
    availableSlots,
    // Turunan
    activeVehicle,
    activeBranch,
    activeServicesList,
    totalCost,
    totalDuration,
    // Promo
    promoInput,
    setPromoInput,
    appliedPromo,
    promoError,
    promoLoading: promosQuery.isLoading,
    applyPromo: () => applyPromo(),
    removePromo,
    promoDiscount,
    finalCost,
    // Langkah
    steps,
    activeStep,
    singleBranch,
    scheduleStepNumber,
    hasVehicle,
    hasServices,
    hasBranch,
    hasSchedule,
    // Aksi
    bookMutation,
    isSubmitDisabled,
    missingHint
  };
}

export type BookingForm = ReturnType<typeof useBookingForm>;
