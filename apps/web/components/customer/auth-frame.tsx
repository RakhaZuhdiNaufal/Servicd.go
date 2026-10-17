import Link from 'next/link';
import { CalendarClock, ReceiptText, Wrench, Car } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { WorkshopHero } from '@/components/illustrations/workshop';

/*
 * Kerangka halaman Masuk/Daftar (tidak dibungkus CustomerShell karena belum login).
 * Desktop: kiri form, kanan panel ilustrasi bengkel + manfaat yang memang ada di aplikasi.
 * HP: satu kolom, panel ilustrasi disembunyikan supaya form langsung terlihat.
 */

const BENEFITS = [
  {
    icon: CalendarClock,
    title: 'Pilih jam yang masih kosong',
    text: 'Slot dihitung dari kapasitas bengkel, jam penuh tidak bisa dipilih.'
  },
  {
    icon: ReceiptText,
    title: 'Estimasi biaya sebelum datang',
    text: 'Harga layanan dan potongan kode promo terlihat di ringkasan booking.'
  },
  {
    icon: Car,
    title: 'Kendaraan dan riwayat tersimpan',
    text: 'Simpan plat nomor sekali, pantau status servis sampai siap diambil.'
  }
];

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-chip" aria-label="ServiceGo, ke Beranda">
          <span className="flex h-8 w-8 items-center justify-center rounded-chip bg-primary-600 text-white">
            <Wrench className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
            Service<span className="text-primary-600 dark:text-primary-500">Go</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        id="konten"
        className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-14 lg:pb-10 lg:pt-4"
      >
        <div className="flex justify-center lg:items-center">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <aside
          aria-label="Yang kamu dapat dengan akun ServiceGo"
          className="relative hidden min-h-[600px] overflow-hidden rounded-[28px] bg-slate-200 lg:block dark:bg-slate-900"
        >
          <WorkshopHero decorative />
          <ul className="absolute inset-x-5 bottom-5 divide-y divide-slate-200 rounded-[20px] border border-slate-200 bg-white px-6 shadow-[0_24px_48px_-16px_rgba(15,23,42,0.35)] dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3.5 py-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
                <div>
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
