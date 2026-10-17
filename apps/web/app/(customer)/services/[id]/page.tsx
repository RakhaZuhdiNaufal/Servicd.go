'use client';

import Link from 'next/link';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, Clock, ReceiptText, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import { fetcher } from '@/lib/fetcher';
import { formatDuration, formatRp } from '@/lib/format';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/customer/states';
import { SERVICE_CATEGORIES, getServiceCategory } from '@/components/customer/booking/service-selector';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  duration_minutes: number;
  is_active: boolean;
}

// Langkah setelah menekan tombol booking, sama dengan stepper di form booking.
const NEXT_STEPS = ['Pilih kendaraan kamu', 'Layanan ini sudah terpilih', 'Pilih tanggal dan jam'];

const card = 'rounded-[20px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Tidak ada endpoint detail layanan, jadi pakai daftar layanan publik (cache sama dengan Beranda).
  const servicesQuery = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => fetcher('/services')
  });

  const services = servicesQuery.data ?? [];
  const service = services.find((s) => s.id === id);
  const category = service ? getServiceCategory(service.name, service.description) : null;
  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.id === category)?.label;
  // Layanan lain di kategori yang sama didahulukan, lalu sisanya.
  const others = services
    .filter((s) => s.id !== id && s.is_active)
    .sort(
      (a, b) =>
        Number(getServiceCategory(b.name, b.description) === category) -
        Number(getServiceCategory(a.name, a.description) === category)
    )
    .slice(0, 4);

  return (
    <div className="space-y-8 sm:space-y-10">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-primary-700 hover:underline dark:text-primary-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke Beranda
      </Link>

      {servicesQuery.isLoading && (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]" role="status" aria-label="Memuat layanan">
          <div className="space-y-4">
            <SkeletonBlock className="h-12 w-2/3" />
            <SkeletonBlock className="h-5 w-full" />
            <SkeletonBlock className="h-5 w-5/6" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
          <SkeletonBlock className="h-80 rounded-[28px]" />
        </div>
      )}

      {servicesQuery.isError && (
        <ErrorState
          title="Detail layanan belum bisa dimuat"
          message={(servicesQuery.error as Error)?.message}
          onRetry={() => servicesQuery.refetch()}
        />
      )}

      {servicesQuery.isSuccess && !service && (
        <EmptyState
          icon={Wrench}
          title="Layanan tidak ditemukan"
          description="Layanan ini mungkin sudah tidak aktif. Lihat daftar layanan yang tersedia di Beranda."
          action={{ label: 'Lihat layanan di Beranda', href: '/' }}
        />
      )}

      {service && (
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-14">
          <div className="space-y-10">
            <div className="space-y-4">
              {categoryLabel && (
                <p className="text-[15px] font-bold text-primary-700 dark:text-primary-100">
                  Kategori {categoryLabel.toLowerCase()}
                </p>
              )}
              <h1 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white">
                {service.name}
              </h1>
              <p className="max-w-2xl text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
                {service.description || 'Bengkel belum menambahkan deskripsi untuk layanan ini.'}
              </p>
            </div>

            <dl
              className={clsx(
                card,
                'grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-slate-800'
              )}
            >
              <div className="flex items-start gap-3.5 px-6 py-5">
                <ReceiptText className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
                <div>
                  <dt className="text-[15px] text-slate-600 dark:text-slate-400">Harga layanan</dt>
                  <dd className="text-[22px] font-extrabold text-slate-900 dark:text-white">{formatRp(service.price)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3.5 px-6 py-5">
                <Clock className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-500" aria-hidden />
                <div>
                  <dt className="text-[15px] text-slate-600 dark:text-slate-400">Perkiraan durasi</dt>
                  <dd className="text-[22px] font-extrabold text-slate-900 dark:text-white">
                    {formatDuration(service.duration_minutes)}
                  </dd>
                </div>
              </div>
            </dl>

            {others.length > 0 && (
              <section aria-labelledby="lain-title" className="space-y-4">
                <div className="space-y-1.5">
                  <h2
                    id="lain-title"
                    className="text-[24px] sm:text-[28px] font-extrabold leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white"
                  >
                    Bisa digabung dalam satu booking
                  </h2>
                  <p className="text-[15px] text-slate-600 dark:text-slate-400">
                    Centang beberapa layanan di form booking, estimasinya dijumlahkan otomatis.
                  </p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {others.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/services/${s.id}`}
                        className="flex h-full min-h-[44px] flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-primary-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                        <span className="flex flex-wrap items-center gap-x-3 text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-900 dark:text-white">{formatRp(s.price)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {formatDuration(s.duration_minutes)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Panel gelap: satu jeda ritme di halaman ini, berisi aksi booking. */}
          <aside
            aria-label="Booking layanan ini"
            className="rounded-[28px] bg-slate-900 p-6 text-white sm:p-8 lg:sticky lg:top-24 dark:bg-slate-950 dark:ring-1 dark:ring-slate-800"
          >
            {service.is_active ? (
              <>
                <p className="text-[15px] text-slate-300">Estimasi biaya</p>
                <p className="mt-1 text-[34px] font-extrabold leading-none tracking-[-0.015em]">{formatRp(service.price)}</p>
                <p className="mt-2 text-sm text-slate-300">Kode promo bisa dipakai di ringkasan booking.</p>
                <Link
                  href={`/booking/new?service_id=${service.id}`}
                  className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-ctl bg-accent-500 px-6 text-[17px] font-bold text-slate-950 hover:bg-accent-600 transition-colors"
                >
                  <CalendarPlus className="h-5 w-5" aria-hidden />
                  Booking servis ini
                </Link>
                <div className="mt-7 border-t border-slate-700 pt-6">
                  <p className="text-[15px] font-bold">Setelah ini</p>
                  <ol className="mt-4 space-y-3.5">
                    {NEXT_STEPS.map((step, i) => (
                      <li key={step} className="flex items-baseline gap-3">
                        <span className="font-mono text-sm font-semibold text-blue-300">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[15px] text-slate-200">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-lg font-bold">Layanan ini sedang tidak tersedia untuk booking.</p>
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-ctl border border-slate-600 px-4 text-[15px] font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Lihat layanan lain
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
