// Cek cepat logika kapasitas. Jalankan dari root repo:
//   pnpm --filter @servicego/database exec tsx ../../apps/web/lib/capacity.check.ts
import assert from 'node:assert/strict';
import { bookingDuration, maxConcurrent, remainingCapacity } from './capacity';

const at = (hhmm: string) => new Date(`2026-12-01T${hhmm}:00+07:00`);
const b = (hhmm: string, minutes: number) => ({ start: at(hhmm), durationMinutes: minutes });

// Booking 3 jam jam 08:00 memblok slot 10:00 (model lama tidak menghitungnya).
assert.equal(maxConcurrent([b('08:00', 180)], at('10:00'), 60), 1);

// Booking yang berakhir tepat saat slot mulai tidak bentrok.
assert.equal(maxConcurrent([b('08:00', 60)], at('09:00'), 60), 0);

// Booking yang mulai di tengah booking baru ikut dihitung.
assert.equal(maxConcurrent([b('10:00', 60)], at('09:00'), 120), 1);

// Dua booking yang tidak saling tumpang tindih di dalam satu booking panjang = puncak 1, bukan 2.
// Kapasitas 2 -> masih muat (model "hitung semua yang bersinggungan" salah menolak ini).
const twoSeparate = [b('08:00', 60), b('10:00', 60)];
assert.equal(maxConcurrent(twoSeparate, at('08:00'), 180), 1);
assert.equal(remainingCapacity(twoSeparate, at('08:00'), 180, 2), 1);

// Dua booking yang benar-benar bersamaan memenuhi kapasitas 2.
assert.equal(remainingCapacity([b('09:00', 60), b('09:00', 90)], at('09:00'), 60, 2), 0);

// Durasi: total layanan, minimal 30 menit, layanan tanpa durasi dihitung 30.
assert.equal(bookingDuration([]), 30);
assert.equal(bookingDuration([20]), 30);
assert.equal(bookingDuration([60, null, 45]), 135);

console.log('capacity.check: semua lolos');
