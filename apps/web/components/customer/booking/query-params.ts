// Helper murni untuk membaca query param form booking (tanpa React, bisa dites langsung).

/** Nama param yang dibaca sebagai daftar layanan, sesuai urutan prioritas. */
export const SERVICE_ID_PARAMS = ['service_id', 'service', 'services'] as const;

/**
 * Semua ID layanan dari URL, mendukung:
 * - param berulang: `?service_id=a&service_id=b`
 * - dipisah koma: `?service_id=a,b`
 * - alias `service` dan `services`
 * Hasil tanpa duplikat dan tanpa string kosong, urutan sesuai kemunculan pertama.
 */
export function serviceIdsFromQuery(params: { getAll(name: string): string[] }): string[] {
  const ids: string[] = [];
  for (const name of SERVICE_ID_PARAMS) {
    for (const raw of params.getAll(name)) {
      for (const part of raw.split(',')) {
        const id = part.trim();
        if (id && !ids.includes(id)) ids.push(id);
      }
    }
  }
  return ids;
}

/** ID dari URL yang benar-benar ada di daftar layanan aktif; ID tak dikenal diabaikan. */
export function validServiceIds(
  requested: string[],
  services: Array<{ id: string; is_active?: boolean }>
): string[] {
  const known = new Set(services.filter((s) => s.is_active !== false).map((s) => s.id));
  return requested.filter((id) => known.has(id));
}
