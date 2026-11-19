// Kapasitas bengkel: berapa booking yang dikerjakan BERSAMAAN, bukan berapa booking yang "dekat".
// Dipakai GET /bookings/available-slots dan POST /bookings supaya keduanya selalu sepakat.

export const MIN_BOOKING_MINUTES = 30;

export interface BookedInterval {
  start: Date;
  durationMinutes: number;
}

/** Durasi booking = total durasi layanannya, minimal 30 menit. */
export function bookingDuration(serviceMinutes: Array<number | null | undefined>): number {
  const total = serviceMinutes.reduce<number>((sum, m) => sum + (m || MIN_BOOKING_MINUTES), 0);
  return Math.max(MIN_BOOKING_MINUTES, total);
}

/**
 * Jumlah maksimum booking lama yang berjalan bersamaan di dalam [start, start + durationMinutes).
 * Booking menempati [mulai, mulai + durasi). Jumlah yang berjalan hanya bisa NAIK di titik mulai
 * sebuah booking, jadi cukup diperiksa di `start` dan di setiap titik mulai booking lain dalam rentang.
 * ponytail: O(n²) per slot; n = booking satu cabang satu hari (puluhan), jauh di bawah batas.
 */
export function maxConcurrent(existing: BookedInterval[], start: Date, durationMinutes: number): number {
  const s = start.getTime();
  const e = s + durationMinutes * 60_000;
  const ranges = existing.map((b) => {
    const bs = b.start.getTime();
    return { bs, be: bs + b.durationMinutes * 60_000 };
  });
  const points = [s, ...ranges.map((r) => r.bs).filter((p) => p > s && p < e)];
  let max = 0;
  for (const p of points) {
    const running = ranges.filter((r) => r.bs <= p && p < r.be).length;
    if (running > max) max = running;
  }
  return max;
}

/** Sisa kapasitas untuk booking baru [start, start + durationMinutes). */
export function remainingCapacity(
  existing: BookedInterval[],
  start: Date,
  durationMinutes: number,
  capacity: number
): number {
  return Math.max(0, capacity - maxConcurrent(existing, start, durationMinutes));
}
