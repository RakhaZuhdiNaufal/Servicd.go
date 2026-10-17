// Helper format bersama untuk portal pelanggan.

export function formatRp(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('id-ID', opts ?? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Waktu dalam WIB
// Timestamp dari server (notifikasi, chat CS) ditampilkan dalam Asia/Jakarta + akhiran "WIB",
// apa pun zona waktu perangkat pengguna. Jadwal bengkel juga WIB, jadi semuanya konsisten.

export const WIB_TIME_ZONE = 'Asia/Jakarta';

function toDate(iso: string | Date): Date {
  return typeof iso === 'string' ? new Date(iso) : iso;
}

/** Tanggal kalender WIB (YYYY-MM-DD), untuk membandingkan "hari yang sama". */
export function wibDateKey(iso: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: WIB_TIME_ZONE }).format(toDate(iso));
}

/** True bila `iso` jatuh di hari yang sama dengan `now` menurut kalender WIB. */
export function isTodayWIB(iso: string | Date, now: Date = new Date()): boolean {
  return wibDateKey(iso) === wibDateKey(now);
}

/** "09.00 WIB" */
export function formatTimeWIB(iso: string | Date): string {
  const time = toDate(iso).toLocaleTimeString('id-ID', {
    timeZone: WIB_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  return `${time} WIB`;
}

/** "Rabu, 14 Oktober" (atau opsi lain) dihitung di zona WIB. */
export function formatDateWIB(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return toDate(iso).toLocaleDateString('id-ID', {
    ...(opts ?? { day: 'numeric', month: 'short', year: 'numeric' }),
    timeZone: WIB_TIME_ZONE
  });
}

/**
 * Waktu notifikasi/pesan dalam WIB:
 * - hari ini: "09.00 WIB" (atau "<todayLabel>, 09.00 WIB" bila todayLabel diisi)
 * - tahun yang sama: "14 Okt, 09.00 WIB"
 * - tahun lain: "14 Okt 2025, 09.00 WIB"
 */
export function formatNotificationTime(
  iso: string | Date,
  options: { now?: Date; todayLabel?: string } = {}
): string {
  const d = toDate(iso);
  const now = options.now ?? new Date();
  const time = formatTimeWIB(d);
  if (isTodayWIB(d, now)) return options.todayLabel ? `${options.todayLabel}, ${time}` : time;
  const sameYear = wibDateKey(d).slice(0, 4) === wibDateKey(now).slice(0, 4);
  const date = formatDateWIB(d, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  return `${date}, ${time}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} jam ${m} menit` : `${h} jam`;
}

/** Kode booking pendek yang mudah dibacakan ke CS, diambil dari 8 karakter awal UUID. */
export function bookingCode(id: string): string {
  return `SG-${id.slice(0, 8).toUpperCase()}`;
}

/** "ServiceGo Margonda Depok" -> "Margonda Depok" */
export function shortBranchName(name: string): string {
  return name.replace(/^ServiceGo\s+/i, '');
}
