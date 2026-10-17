// Format waktu panel admin. Jadwal bengkel selalu dalam WIB, apa pun zona waktu browser admin.

const TZ = 'Asia/Jakarta';

/** "Rab, 14 Okt 2026" */
export function adminDate(iso: string, withYear = true): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {})
  });
}

/** "09.00" */
export function adminTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

/** "Rab, 14 Okt, 09.00 WIB" */
export function adminSchedule(iso: string): string {
  return `${adminDate(iso, false)}, ${adminTime(iso)} WIB`;
}

export function toNumber(v: number | string | null | undefined): number {
  const n = typeof v === 'string' ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
}
