'use client';

import { useMemo, useState } from 'react';
import { Clock, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { btnSecondary, card, h1, h2, lead, pageStack } from '@/components/customer/ui';
import {
  CATEGORY_ICONS,
  SERVICE_CATEGORIES,
  type ServiceCategoryId
} from '@/components/customer/booking/service-selector';

/**
 * Halaman tutorial video: cara pasang/ganti komponen sendiri di rumah.
 *
 * Daftarnya statis karena video ini materi tetap, bukan data yang berubah dari
 * bengkel. File .mp4 diletakkan di apps/web/public/videos/ (lihat README di sana).
 */

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: ServiceCategoryId;
  /** Nama file di apps/web/public/videos/ */
  file: string;
  duration: string;
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'ganti-oli',
    title: 'Ganti Oli Mesin Sendiri',
    description: 'Dari buka baut pembuangan, ganti filter oli, sampai takaran oli baru yang pas.',
    category: 'oli',
    file: 'ganti-oli-mesin.mp4',
    duration: '8 menit'
  },
  {
    id: 'filter-udara',
    title: 'Bersihkan & Ganti Filter Udara',
    description: 'Cara buka boks filter, bedanya filter yang masih layak dan yang harus diganti.',
    category: 'mesin',
    file: 'ganti-filter-udara.mp4',
    duration: '5 menit'
  },
  {
    id: 'cek-aki',
    title: 'Cek Kondisi Aki & Bersihkan Terminal',
    description: 'Ukur tegangan aki pakai multimeter dan bersihkan kerak di kutub aki.',
    category: 'kelistrikan',
    file: 'cek-aki.mp4',
    duration: '6 menit'
  },
  {
    id: 'kampas-rem',
    title: 'Ganti Kampas Rem Depan',
    description: 'Buka kaliper, ukur ketebalan kampas, dan pasang kampas baru dengan benar.',
    category: 'rem',
    file: 'ganti-kampas-rem.mp4',
    duration: '12 menit'
  },
  {
    id: 'air-radiator',
    title: 'Isi Ulang Air Radiator',
    description: 'Cek level coolant saat mesin dingin dan cara isi ulang tanpa masuk angin.',
    category: 'mesin',
    file: 'isi-air-radiator.mp4',
    duration: '4 menit'
  },
  {
    id: 'filter-ac',
    title: 'Ganti Filter AC Kabin',
    description: 'Lokasi filter kabin di balik dashboard dan cara pasang ulang yang rapat.',
    category: 'ac',
    file: 'ganti-filter-ac.mp4',
    duration: '7 menit'
  }
];

const videoUrl = (file: string) => `/videos/${file}`;

export default function TutorialPage() {
  const [picked, setPicked] = useState<ServiceCategoryId | 'all'>('all');

  // Kategori hanya ditampilkan kalau memang ada tutorialnya.
  const cats = useMemo(
    () => SERVICE_CATEGORIES.filter((c) => TUTORIALS.some((t) => t.category === c.id)),
    []
  );
  const list = picked === 'all' ? TUTORIALS : TUTORIALS.filter((t) => t.category === picked);

  return (
    <div className={pageStack}>
      <section aria-labelledby="tutorial-title" className="space-y-6 pt-2 sm:pt-4">
        <div className="max-w-2xl space-y-2">
          <h1 id="tutorial-title" className={h1}>
            Tutorial perawatan
          </h1>
          <p className={lead}>
            Video langkah demi langkah untuk perawatan yang bisa kamu kerjakan sendiri di rumah. Bisa ditonton langsung
            atau diunduh dulu supaya tetap bisa dibuka tanpa internet.
          </p>
        </div>

        <div role="tablist" aria-label="Kategori tutorial" className="flex flex-wrap gap-2">
          {[{ id: 'all' as const, label: 'Semua' }, ...cats].map((c) => {
            const on = c.id === picked;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPicked(c.id)}
                className={clsx(
                  'min-h-[44px] rounded-chip border px-4 text-[15px] font-semibold transition-colors',
                  on
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <ul role="tabpanel" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const Icon = CATEGORY_ICONS[t.category];
            return (
              <li key={t.id} className={clsx(card, 'flex h-full flex-col overflow-hidden')}>
                {/* preload="metadata" supaya frame pertama tampil sebagai sampul tanpa mengunduh seluruh video. */}
                <video
                  controls
                  preload="metadata"
                  src={videoUrl(t.file)}
                  aria-label={`Video tutorial ${t.title}`}
                  className="h-44 w-full bg-slate-900 object-cover"
                />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="leading-snug text-slate-900 dark:text-white">{t.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {SERVICE_CATEGORIES.find((c) => c.id === t.category)?.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {t.duration}
                    </span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t.description}</p>
                  <div className="mt-4 flex justify-end pt-1">
                    <a href={videoUrl(t.file)} download className={clsx(btnSecondary, 'shrink-0')}>
                      <Download className="h-4 w-4" aria-hidden />
                      Unduh
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="bantuan-title" className="space-y-2">
        <h2 id="bantuan-title" className={h2}>
          Ragu mengerjakan sendiri?
        </h2>
        <p className={lead}>
          Kalau langkahnya terasa berisiko atau alatnya tidak ada, booking servis saja. Mekanik kami yang kerjakan.
        </p>
      </section>
    </div>
  );
}
