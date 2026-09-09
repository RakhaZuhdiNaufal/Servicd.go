export const BOOKING_STATUS = ['menunggu', 'diproses', 'selesai', 'dibatalkan'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

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
