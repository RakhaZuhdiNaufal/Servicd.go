// Semua jam operasional bengkel dihitung dalam WIB (UTC+07:00).
// Database menyimpan timestamp UTC; helper ini mengubah "tanggal + jam WIB" menjadi Date yang benar.

export const WIB_OFFSET = '+07:00';

/** Jam mulai slot booking (WIB). Dipakai GET /bookings/available-slots dan validasi POST /bookings. */
export const OPERATING_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

/** "2026-10-14" + "09:00" (WIB) -> Date (2026-10-14T02:00:00Z). */
export function wibDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${WIB_OFFSET}`);
}

/** Rentang 00:00 sampai 23:59:59.999 WIB untuk tanggal YYYY-MM-DD. */
export function wibDayRange(date: string): { start: Date; end: Date } {
  return {
    start: new Date(`${date}T00:00:00.000${WIB_OFFSET}`),
    end: new Date(`${date}T23:59:59.999${WIB_OFFSET}`)
  };
}

/** Tanggal (YYYY-MM-DD) dan jam (HH:mm) WIB dari sebuah Date. */
export function toWIBParts(d: Date): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(d);
  return { date, time };
}

/** True bila `value` berformat YYYY-MM-DD dan merupakan tanggal kalender yang benar (2026-02-30 ditolak). */
export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Tanggal hari ini di WIB (YYYY-MM-DD). */
export function todayWIB(now: Date = new Date()): string {
  return toWIBParts(now).date;
}
