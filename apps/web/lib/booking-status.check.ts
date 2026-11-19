// Cek cepat aturan status booking. Jalankan dari root repo:
//   pnpm --filter @servicego/database exec tsx ../../apps/web/lib/booking-status.check.ts
import assert from 'node:assert/strict';
import { bookingStatusBlockReason, isScheduleDayReached } from '@servicego/shared';

const booking = '2026-12-10T02:00:00Z'; // 10 Des 09:00 WIB
const dayBefore = new Date('2026-12-09T16:59:00Z'); // 9 Des 23:59 WIB
const sameDay = new Date('2026-12-09T17:00:00Z'); // 10 Des 00:00 WIB (masih 9 Des di UTC)

// Hari jadwal dihitung dalam WIB, bukan UTC.
assert.equal(isScheduleDayReached(booking, dayBefore), false);
assert.equal(isScheduleDayReached(booking, sameDay), true);

// Alur: menunggu -> dikonfirmasi -> diproses -> selesai. Tidak bisa melompat.
assert.equal(bookingStatusBlockReason('menunggu', 'dikonfirmasi', booking, dayBefore), null);
assert.notEqual(bookingStatusBlockReason('menunggu', 'diproses', booking, sameDay), null);

// Dikonfirmasi -> diproses hanya mulai hari jadwal.
assert.notEqual(bookingStatusBlockReason('dikonfirmasi', 'diproses', booking, dayBefore), null);
assert.equal(bookingStatusBlockReason('dikonfirmasi', 'diproses', booking, sameDay), null);

// Pembatalan boleh kapan saja sebelum final; status final tidak bisa diubah.
assert.equal(bookingStatusBlockReason('dikonfirmasi', 'dibatalkan', booking, dayBefore), null);
assert.notEqual(bookingStatusBlockReason('selesai', 'dibatalkan', booking, sameDay), null);
assert.notEqual(bookingStatusBlockReason('dibatalkan', 'menunggu', booking, sameDay), null);

console.log('booking-status.check: semua lolos');
