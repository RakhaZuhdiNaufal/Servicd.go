'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Vehicle, Service, Branch, AvailableSlotsResponse } from './types';

export function useBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const queryServiceId = searchParams.get('service_id') || searchParams.get('service');
  const queryVehicleId = searchParams.get('vehicle_id');
  const queryBranchId = searchParams.get('branch_id');

  // Form selections - selectedVehicle starts as empty string (no hardcoded fallback)
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [complaintNotes, setComplaintNotes] = useState<string>('');

  // Default date: tomorrow
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  }, []);

  // Fetch Vehicles (only when authenticated, no mock data fallback)
  const {
    data: vehicles = [],
    isLoading: vLoading,
    isError: vError
  } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => fetcher('/vehicles'),
    enabled: !!user
  });

  // Fetch Services
  const {
    data: services = [],
    isLoading: sLoading,
    isError: sError
  } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  // Fetch Branches
  const {
    data: branches = [],
    isLoading: bLoading,
    isError: bError
  } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => fetcher('/branches')
  });

  // Fetch Available Slots for selected branch & date
  const {
    data: slotsData,
    isLoading: slotsLoading,
    isError: slotsError
  } = useQuery<AvailableSlotsResponse>({
    queryKey: ['available-slots', selectedDate, selectedBranch],
    queryFn: () =>
      fetcher(
        `/bookings/available-slots?date=${selectedDate}${
          selectedBranch ? `&branch_id=${selectedBranch}` : ''
        }`
      ),
    enabled: !!selectedDate
  });

  // Filter available slots without mock/hardcode fallback
  const availableSlots = slotsData?.slots?.filter((s) => s.is_available) ?? [];

  // Pre-selection: Vehicle from URL parameter only (no auto-select fallback)
  useEffect(() => {
    if (queryVehicleId && vehicles.some((v) => v.id === queryVehicleId)) {
      setSelectedVehicle(queryVehicleId);
    }
  }, [vehicles, queryVehicleId]);

  // Pre-selection: Service from URL parameter only (no auto-select fallback)
  useEffect(() => {
    const activeServices = services.filter((s) => s.is_active);
    if (queryServiceId && activeServices.some((s) => s.id === queryServiceId)) {
      setSelectedServices((prev) =>
        prev.includes(queryServiceId) ? prev : [...prev, queryServiceId]
      );
    }
  }, [services, queryServiceId]);

  // Pre-selection: Branch from URL parameter only (no auto-select fallback)
  useEffect(() => {
    if (queryBranchId && branches.some((b) => b.id === queryBranchId)) {
      setSelectedBranch(queryBranchId);
    }
  }, [branches, queryBranchId]);

  // Validate time slot when availableSlots change: reset if selected time is no longer available
  useEffect(() => {
    if (selectedTime) {
      const isCurrentTimeValid = availableSlots.some((s) => s.time === selectedTime);
      if (!isCurrentTimeValid) {
        setSelectedTime('');
      }
    }
  }, [availableSlots, selectedTime]);

  // Calculated active entities
  const activeVehicle = vehicles.find((v) => v.id === selectedVehicle) ?? null;
  const activeBranch = branches.find((b) => b.id === selectedBranch) ?? null;
  const activeServicesList = services.filter((s) => selectedServices.includes(s.id));

  const totalCost = activeServicesList.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );
  const totalDuration = activeServicesList.reduce(
    (sum, s) => sum + Number(s.duration_minutes || 0),
    0
  );

  // Toggle selection for vehicle (can be unselected by clicking again)
  const handleSelectVehicle = (id: string) => {
    setSelectedVehicle((prev) => (prev === id ? '' : id));
  };

  // Toggle selection for branch (can be unselected by clicking again)
  const handleSelectBranch = (id: string) => {
    setSelectedBranch((prev) => (prev === id ? '' : id));
  };

  // Toggle multiple services (can be unselected completely down to 0)
  const toggleService = (id: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  // Stepper logic: strict check (hasVehicle is true ONLY when selectedVehicle is filled)
  const hasVehicle = !!selectedVehicle;
  const hasServices = selectedServices.length > 0;
  const hasBranch = !!selectedBranch;
  const hasSchedule = !!selectedDate && !!selectedTime && availableSlots.length > 0;

  // Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.info('Silakan masuk terlebih dahulu untuk menyelesaikan konfirmasi booking.');
        router.push('/login?redirect=/booking/new');
        return null;
      }

      if (!selectedVehicle) {
        throw new Error('Silakan pilih kendaraan yang akan diservis.');
      }
      if (selectedServices.length === 0) {
        throw new Error('Silakan pilih minimal satu jenis layanan.');
      }
      if (!selectedBranch) {
        throw new Error('Silakan pilih bengkel tujuan.');
      }
      if (!selectedDate || !selectedTime) {
        throw new Error('Silakan tentukan tanggal dan jam kedatangan.');
      }

      // Compose ISO date string with WIB (+07:00) timezone offset
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00+07:00`).toISOString();

      return fetcher('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          vehicle_id: selectedVehicle,
          service_ids: selectedServices,
          branch_id: selectedBranch,
          scheduled_at: scheduledDateTime,
          complaint_notes: complaintNotes.trim() || null
        })
      });
    },
    onSuccess: (data: any) => {
      if (!data) return;
      toast.success('Booking servis berhasil dibuat!');
      router.replace(`/bookings/${data?.id ?? ''}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membuat booking. Silakan coba lagi.');
    }
  });

  // Submit button disabled validation
  const isSubmitDisabled =
    bookMutation.isPending ||
    !hasVehicle ||
    !hasServices ||
    !hasBranch ||
    !hasSchedule ||
    availableSlots.length === 0 ||
    slotsLoading ||
    slotsError;

  return {
    // Auth & state
    user,
    // Selections
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
    // Data & loading
    vehicles,
    vLoading,
    vError,
    services,
    sLoading,
    sError,
    branches,
    bLoading,
    bError,
    slotsData,
    slotsLoading,
    slotsError,
    availableSlots,
    // Active helpers
    activeVehicle,
    activeBranch,
    activeServicesList,
    totalCost,
    totalDuration,
    // Step completion
    hasVehicle,
    hasServices,
    hasBranch,
    hasSchedule,
    // Action
    bookMutation,
    isSubmitDisabled
  };
}
