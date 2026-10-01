'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { X, ChevronLeft } from 'lucide-react';
import {
  useBookingForm,
  BookingStepper,
  VehicleSelector,
  ServiceSelector,
  BranchSelector,
  SchedulePicker,
  BookingSummary
} from '@/components/customer/booking';

function BookingNewPageContent() {
  const {
    // Selections
    selectedVehicle,
    setSelectedVehicle,
    selectedServices,
    toggleService,
    selectedBranch,
    setSelectedBranch,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    complaintNotes,
    setComplaintNotes,
    // Data & loading
    vehicles,
    vLoading,
    services,
    sLoading,
    branches,
    bLoading,
    slotsLoading,
    slotsError,
    availableSlots,
    // Active helpers
    activeVehicle,
    activeBranch,
    activeServicesList,
    totalCost,
    // Step completion
    hasVehicle,
    hasServices,
    hasBranch,
    hasSchedule,
    // Actions
    bookMutation,
    isSubmitDisabled
  } = useBookingForm();

  return (
    <div className="space-y-8 pb-10">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HEADER + STEPPER (Directly on page background — No card wrapper) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Title row */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Booking Servis Kendaraan
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Atur kendaraan, layanan, dan waktu servis yang paling pas untuk Anda
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 transition shadow-sm shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Batalkan</span>
          </Link>
        </div>

        {/* Full-width Stepper Bar (25% proportional dynamic progress) */}
        <BookingStepper
          hasVehicle={hasVehicle}
          hasServices={hasServices}
          hasBranch={hasBranch}
          hasSchedule={hasSchedule}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. OPEN CANVAS 2-COLUMN LAYOUT (~65% Left / ~35% Sticky Right)      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: MODULAR SECTION CARDS (~65% / col-span-8)            */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Kendaraan */}
          <VehicleSelector
            vehicles={vehicles}
            isLoading={vLoading}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
          />

          {/* Card 2: Layanan */}
          <ServiceSelector
            services={services}
            isLoading={sLoading}
            selectedServices={selectedServices}
            onToggleService={toggleService}
          />

          {/* Card 3: Bengkel */}
          <BranchSelector
            branches={branches}
            isLoading={bLoading}
            selectedBranch={selectedBranch}
            onSelectBranch={setSelectedBranch}
          />

          {/* Card 4: Jadwal & Catatan */}
          <SchedulePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedTime={selectedTime}
            onTimeChange={setSelectedTime}
            complaintNotes={complaintNotes}
            onComplaintNotesChange={setComplaintNotes}
            availableSlots={availableSlots}
            isLoadingSlots={slotsLoading}
            isErrorSlots={slotsError}
          />

          {/* Bottom Back Button */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: STICKY "RINGKASAN BOOKING" (~35% / col-span-4)     */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4">
          <BookingSummary
            activeVehicle={activeVehicle}
            activeServicesList={activeServicesList}
            activeBranch={activeBranch}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            totalCost={totalCost}
            isSubmitting={bookMutation.isPending}
            isSubmitDisabled={isSubmitDisabled}
            onSubmit={() => bookMutation.mutate()}
          />
        </div>
      </div>
    </div>
  );
}

export default function BookingNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat formulir booking...</div>}>
      <BookingNewPageContent />
    </Suspense>
  );
}
