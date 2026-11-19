'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  useBookingForm,
  BookingStepper,
  VehicleSelector,
  ServiceSelector,
  BranchSelector,
  SchedulePicker,
  BookingSummary,
  MobileBookingBar,
  PromoField,
  SummaryDetails
} from '@/components/customer/booking';
import { SkeletonBlock } from '@/components/customer/states';

function BookingNewPageContent() {
  const f = useBookingForm();
  const isGuest = !f.authLoading && !f.user;

  const summaryProps = {
    activeVehicle: f.activeVehicle,
    activeServicesList: f.activeServicesList,
    activeBranch: f.activeBranch,
    selectedDate: f.selectedDate,
    selectedTime: f.selectedTime,
    totalCost: f.totalCost,
    totalDuration: f.totalDuration,
    promoDiscount: f.promoDiscount,
    finalCost: f.finalCost,
    appliedPromo: f.appliedPromo,
    isGuest,
    loginHref: f.loginHref,
    isSubmitting: f.bookMutation.isPending,
    isSubmitDisabled: f.isSubmitDisabled,
    missingHint: f.missingHint,
    onSubmit: () => f.bookMutation.mutate()
  };

  const promoProps = {
    promoInput: f.promoInput,
    onPromoInputChange: f.setPromoInput,
    appliedPromo: f.appliedPromo,
    promoError: f.promoError,
    promoLoading: f.promoLoading,
    onApplyPromo: f.applyPromo,
    onRemovePromo: f.removePromo
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white sm:text-[38px]">
              Booking servis
            </h1>
            <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
              {f.steps.length === 3 ? 'Tiga' : 'Empat'} langkah singkat. Estimasi biaya terhitung langsung, dan pilihan bisa diubah kapan saja sebelum
              konfirmasi.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-[44px] shrink-0 items-center self-start rounded-ctl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 sm:self-auto"
          >
            Batal, ke Beranda
          </Link>
        </div>
        <BookingStepper steps={f.steps} activeStep={f.activeStep} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <VehicleSelector
            isGuest={isGuest}
            authLoading={f.authLoading}
            loginHref={f.loginHref}
            vehicles={f.vehicles}
            isLoading={f.vLoading}
            isError={f.vError}
            onRetry={() => f.refetchVehicles()}
            selectedVehicle={f.selectedVehicle}
            onSelectVehicle={f.setSelectedVehicle}
            active={f.activeStep === 'kendaraan'}
            done={f.hasVehicle}
          />

          <ServiceSelector
            services={f.services}
            isLoading={f.sLoading}
            isError={f.sError}
            onRetry={() => f.refetchServices()}
            selectedServices={f.selectedServices}
            onToggleService={f.toggleService}
            active={f.activeStep === 'layanan'}
            done={f.hasServices}
          />

          <BranchSelector
            branches={f.branches}
            isLoading={f.bLoading}
            isError={f.bError}
            onRetry={() => f.refetchBranches()}
            selectedBranch={f.selectedBranch}
            onSelectBranch={f.setSelectedBranch}
            active={f.activeStep === 'bengkel'}
            done={f.hasBranch}
          />

          <SchedulePicker
            hasBranch={f.hasBranch}
            number={f.scheduleStepNumber}
            selectedDate={f.selectedDate}
            onDateChange={f.setSelectedDate}
            selectedTime={f.selectedTime}
            onTimeChange={f.setSelectedTime}
            complaintNotes={f.complaintNotes}
            onComplaintNotesChange={f.setComplaintNotes}
            slots={f.allSlots}
            isLoadingSlots={f.slotsLoading}
            isErrorSlots={f.slotsError}
            onRetrySlots={() => f.refetchSlots()}
            active={f.activeStep === 'jadwal'}
            done={f.hasSchedule}
          />

          {/* Mobile: rincian akhir sebelum konfirmasi (di desktop ada di kolom kanan). */}
          <section
            aria-labelledby="ringkasan-mobile"
            className="rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7 lg:hidden"
          >
            <h2
              id="ringkasan-mobile"
              className="mb-5 text-[20px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white sm:text-[24px]"
            >
              Cek lagi pilihanmu
            </h2>
            <SummaryDetails {...summaryProps} />
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <PromoField {...promoProps} idPrefix="promo-mobile" />
            </div>
          </section>
        </div>

        <div className="hidden lg:col-span-4 lg:block lg:self-stretch">
          <BookingSummary {...summaryProps} promo={promoProps} />
        </div>
      </div>

      <MobileBookingBar {...summaryProps} />
    </div>
  );
}

function BookingFormFallback() {
  return (
    <div className="space-y-8" role="status" aria-label="Memuat formulir booking">
      <SkeletonBlock className="h-11 w-64" />
      <SkeletonBlock className="h-14 w-full" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <SkeletonBlock className="h-48 w-full rounded-[20px]" />
          <SkeletonBlock className="h-64 w-full rounded-[20px]" />
        </div>
        <SkeletonBlock className="hidden h-96 rounded-[20px] lg:col-span-4 lg:block" />
      </div>
    </div>
  );
}

export default function BookingNewPage() {
  // useSearchParams (di useBookingForm) wajib berada di dalam Suspense pada Next 15.
  return (
    <Suspense fallback={<BookingFormFallback />}>
      <BookingNewPageContent />
    </Suspense>
  );
}
