'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema, type CreateBookingInput } from '@servicego/shared';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { CheckCircle, ChevronLeft, ChevronRight, Car, Wrench, Clock, Calendar, FileText, AlertCircle } from 'lucide-react';

interface Vehicle { id: string; plate_number: string; brand: string; model: string; vehicle_type: string }
interface Service { id: string; name: string; price: number; duration_minutes: number; is_active: boolean }
interface SlotDay { date: string; available_slots: string[] }

const STEPS = [
  { label: 'Kendaraan', icon: Car },
  { label: 'Layanan', icon: Wrench },
  { label: 'Jadwal', icon: Calendar },
  { label: 'Catatan', icon: FileText },
  { label: 'Konfirmasi', icon: CheckCircle }
];

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function BookingNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedService = searchParams.get('service');

  const [step, setStep] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>(
    preSelectedService ? [preSelectedService] : []
  );
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');

  const { data: vehicles = [], isLoading: vLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher('/vehicles')
  });

  const { data: services = [], isLoading: sLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery<SlotDay[]>({
    queryKey: ['available-slots', selectedDate],
    queryFn: () =>
      fetcher(`/bookings/available-slots${selectedDate ? `?date=${selectedDate}` : ''}`),
    enabled: step === 2
  });

  const selectedServiceObjects = services.filter((s) => selectedServices.includes(s.id));
  const estimatedCost = selectedServiceObjects.reduce((sum, s) => sum + s.price, 0);
  const estimatedMinutes = selectedServiceObjects.reduce((sum, s) => sum + s.duration_minutes, 0);

  const bookMutation = useMutation({
    mutationFn: (payload: CreateBookingInput) =>
      fetcher('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (data: any) => {
      toast.success('Booking berhasil dibuat!');
      router.replace(`/bookings/${data?.id ?? ''}`);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function canNext() {
    if (step === 0) return !!selectedVehicle;
    if (step === 1) return selectedServices.length > 0;
    if (step === 2) return !!selectedSlot;
    if (step === 3) return true;
    return true;
  }

  function submit() {
    if (!selectedVehicle || !selectedSlot) return;
    bookMutation.mutate({
      vehicle_id: selectedVehicle,
      service_ids: selectedServices,
      scheduled_at: selectedSlot,
      complaint_notes: notes || null
    });
  }

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySlots = slotsData?.find((d) => d.date === (selectedDate || todayStr))?.available_slots ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Booking Servis</h1>

      {/* Step Indicator */}
      <div className="flex items-center">
        {STEPS.map(({ label, icon: Icon }, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  'h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors',
                  i < step
                    ? 'bg-primary-600 text-white'
                    : i === step
                    ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                )}
              >
                {i < step ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={clsx('text-xs font-medium', i === step ? 'text-primary-600' : 'text-slate-400')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx('flex-1 h-0.5 mx-2 mb-4 transition-colors', i < step ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700')} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 min-h-[280px]">

        {/* Step 0: Vehicle */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Pilih Kendaraan</h2>
            {vLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 shimmer rounded-lg" />)}</div>
            ) : vehicles.length === 0 ? (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Belum ada kendaraan</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Tambahkan kendaraan di <a href="/profile" className="underline font-semibold">Profil</a> terlebih dahulu.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={clsx(
                      'w-full flex items-center gap-4 rounded-lg border p-3 text-left transition',
                      selectedVehicle === v.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                    )}
                  >
                    <div className={clsx('h-10 w-10 rounded-md flex items-center justify-center',
                      selectedVehicle === v.id ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-data font-bold text-slate-800 dark:text-slate-200">{v.plate_number}</p>
                      <p className="text-xs text-slate-500">{v.brand} {v.model} · {v.vehicle_type}</p>
                    </div>
                    {selectedVehicle === v.id && <CheckCircle className="h-5 w-5 text-primary-600 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Pilih Layanan</h2>
            <p className="text-xs text-slate-500">Bisa pilih lebih dari satu</p>
            {sLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
            ) : (
              <div className="space-y-2">
                {services.filter((s) => s.is_active).map((s) => {
                  const checked = selectedServices.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition',
                        checked
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                      )}
                    >
                      <div className={clsx('h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition',
                        checked ? 'bg-primary-600 border-primary-600' : 'border-slate-300 dark:border-slate-600')}>
                        {checked && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="font-data">{formatRp(s.price)}</span>
                          <span>·</span>
                          <Clock className="h-3 w-3" />{s.duration_minutes} mnt
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Estimasi Biaya</span>
                  <span className="font-data text-primary-700">{formatRp(estimatedCost)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-xs mt-0.5">
                  <span>Estimasi Durasi</span>
                  <span>{estimatedMinutes} menit</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Pilih Jadwal</h2>
            <div className="space-y-1">
              <label htmlFor="booking-date" className="text-sm text-slate-600 dark:text-slate-400">Tanggal</label>
              <input
                id="booking-date"
                type="date"
                min={todayStr}
                value={selectedDate || todayStr}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {slotsLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-10 shimmer rounded-md" />)}
              </div>
            ) : todaySlots.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Tidak ada slot tersedia pada tanggal ini</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {todaySlots.map((slot) => {
                  const time = new Date(slot).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={clsx(
                        'rounded-md border py-2.5 text-sm font-medium transition hover:shadow-sm',
                        selectedSlot === slot
                          ? 'border-primary-500 bg-primary-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950'
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Notes */}
        {step === 3 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Catatan Keluhan (Opsional)</h2>
            <p className="text-xs text-slate-500">Ceritakan masalah kendaraanmu agar mekanik bisa mempersiapkan diri</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Mesin sering panas, rem depan kurang pakem…"
              rows={5}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Ringkasan Booking</h2>
            {(() => {
              const v = vehicles.find((x) => x.id === selectedVehicle);
              return (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kendaraan</span>
                    <span className="font-data font-semibold">{v?.plate_number} — {v?.brand} {v?.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Layanan</span>
                    <div className="text-right">
                      {selectedServiceObjects.map((s) => <p key={s.id}>{s.name}</p>)}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jadwal</span>
                    <span>{new Date(selectedSlot).toLocaleString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}</span>
                  </div>
                  {notes && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Catatan</span>
                      <span className="text-right max-w-[60%]">{notes}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between font-bold text-base">
                    <span>Estimasi Total</span>
                    <span className="font-data text-primary-700">{formatRp(estimatedCost)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="flex items-center gap-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40 transition"
          >
            Lanjut
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={bookMutation.isPending}
            className="flex items-center gap-1.5 rounded-md bg-accent-500 hover:bg-accent-600 text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50 transition"
          >
            {bookMutation.isPending ? 'Memproses…' : 'Konfirmasi Booking'}
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
