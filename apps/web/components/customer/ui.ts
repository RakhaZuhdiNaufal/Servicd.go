/**
 * Kelas tampilan bersama portal pelanggan.
 *
 * Satu sumber supaya tombol, kartu, dan judul di semua halaman dashboard punya
 * ukuran, radius, dan bobot huruf yang sama. Warna sorot hanya accent (oren);
 * sisanya netral, mengikuti landing page.
 */

/** Tombol utama halaman (satu per layar: Booking servis baru). */
export const btnAccent =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-ctl bg-accent-500 px-5 text-[15px] font-semibold text-slate-950 hover:bg-accent-600 transition-colors';

/** Tombol aksi di dalam konten. */
export const btnPrimary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-ctl bg-primary-700 px-4 text-[15px] font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70 transition-colors';

export const btnSecondary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-ctl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 transition-colors';

export const btnDanger =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-ctl bg-red-600 px-4 text-[15px] font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors';

/** Tautan teks sebaris (Kelola di Profil, Lihat semua). */
export const linkText =
  'inline-flex min-h-[44px] items-center text-[15px] font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white';

/** Satu radius kartu untuk seluruh dashboard. */
export const card = 'rounded-[20px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

/** Hierarki judul: h1 halaman, h2 bagian, lead paragraf pengantar. */
export const h1 =
  'text-[30px] sm:text-[38px] font-bold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white';
export const h2 =
  'text-[22px] sm:text-[26px] font-bold leading-[1.2] tracking-[-0.01em] text-slate-900 dark:text-white';
export const lead = 'text-[16px] leading-relaxed text-slate-600 dark:text-slate-400';

/** Jarak antar bagian halaman dashboard. */
export const pageStack = 'space-y-12 sm:space-y-14';
