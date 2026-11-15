export const BOOKING_STATUS = ['menunggu', 'dikonfirmasi', 'diproses', 'selesai', 'dibatalkan'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

/** Status yang masih berjalan (belum selesai/batal). */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ['menunggu', 'dikonfirmasi', 'diproses'];

/**
 * Alur status booking yang sah. Satu sumber untuk server (PATCH status) dan UI admin.
 * menunggu -> dikonfirmasi (bengkel menyanggupi jadwal) -> diproses (kendaraan dikerjakan) -> selesai.
 * selesai & dibatalkan = status akhir: booking selesai sudah tercatat sebagai pendapatan
 * dan pelanggan sudah diberi notifikasi, jadi tidak boleh "dibuka" lagi.
 */
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  menunggu: ['dikonfirmasi', 'dibatalkan'],
  dikonfirmasi: ['diproses', 'dibatalkan'],
  diproses: ['selesai', 'dibatalkan'],
  selesai: [],
  dibatalkan: []
};

export function canTransitionBookingStatus(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_STATUS_TRANSITIONS[from].includes(to);
}

const wibDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

/** Servis baru boleh dimulai (diproses) mulai hari jadwalnya, menurut kalender WIB. */
export function isScheduleDayReached(scheduledAt: Date | string, now: Date = new Date()): boolean {
  return wibDate(now) >= wibDate(new Date(scheduledAt));
}

/** Alasan perubahan status ditolak, atau null bila boleh. Dipakai server dan UI admin. */
export function bookingStatusBlockReason(
  from: BookingStatus,
  to: BookingStatus,
  scheduledAt: Date | string,
  now: Date = new Date()
): string | null {
  if (!canTransitionBookingStatus(from, to)) {
    const next = BOOKING_STATUS_TRANSITIONS[from];
    return next.length
      ? `Booking berstatus ${from} hanya bisa diubah ke ${next.join(' atau ')}.`
      : `Booking berstatus ${from} sudah final dan tidak bisa diubah lagi.`;
  }
  if (to === 'diproses' && !isScheduleDayReached(scheduledAt, now)) {
    return 'Servis baru bisa dimulai pada hari jadwal booking.';
  }
  return null;
}

export const USER_ROLE = ['admin', 'customer'] as const;
export type UserRole = (typeof USER_ROLE)[number];

export const VEHICLE_TYPE = ['mobil', 'motor'] as const;
export type VehicleType = (typeof VEHICLE_TYPE)[number];

export const PHOTO_STAGE = ['checkin', 'checkout'] as const;
export type PhotoStage = (typeof PHOTO_STAGE)[number];

export const NOTIFICATION_CHANNEL = ['push', 'whatsapp', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

export const PAYMENT_TYPE = ['dp', 'pelunasan'] as const;
export type PaymentType = (typeof PAYMENT_TYPE)[number];

export const PAYMENT_STATUS = ['pending', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];
