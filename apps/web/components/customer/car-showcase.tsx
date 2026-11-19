'use client';

import { useState } from 'react';
import Script from 'next/script';
import { clsx } from 'clsx';
import { h2, lead } from '@/components/customer/ui';

/**
 * Panggung 3D mobil di landing page.
 *
 * Model GLB dirender oleh <model-viewer> (web component Google, dimuat dari CDN)
 * supaya tidak perlu menambah three.js ke dependency.
 */

// <model-viewer> adalah custom element, jadi TSX perlu diberi tahu tag-nya ada.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
        Record<string, unknown>;
    }
  }
}

const CARS = [
  {
    id: 'amg',
    name: 'Mercedes-AMG',
    tagline: 'Midnight Apex',
    spec: 'V8 4.0L Biturbo',
    src: '/models/amg.glb'
  },
  {
    id: 'mclaren',
    name: 'Mercedes McLaren',
    tagline: 'Silver Series',
    spec: 'V8 5.4L Supercharged',
    src: '/models/mclaren.glb'
  }
];

/** Lama animasi mobil keluar ke kiri; harus sama dengan .mobil-keluar di globals.css. */
const DURASI_KELUAR = 450;

export function CarShowcase() {
  const [aktif, setAktif] = useState(0);
  const [keluar, setKeluar] = useState(false);

  function pilih(i: number) {
    if (i === aktif || keluar) return;
    // Mobil lama digeser keluar dulu, baru yang baru dipasang dan masuk dari kanan.
    setKeluar(true);
    setTimeout(() => {
      setAktif(i);
      setKeluar(false);
    }, DURASI_KELUAR);
  }

  const mobil = CARS[aktif];

  return (
    <section aria-labelledby="koleksi-title" className="space-y-6">
      <Script
        type="module"
        src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
        strategy="lazyOnload"
      />

      <div className="max-w-2xl space-y-2">
        <h2 id="koleksi-title" className={h2}>
          Mobil yang kami rawat
        </h2>
        <p className={lead}>Putar modelnya untuk lihat dari segala sisi, atau pilih mobil lain untuk berganti.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-center">
        {/* Panggung: overflow-hidden supaya mobil benar-benar hilang saat digeser keluar. */}
        <div className="relative overflow-hidden rounded-[20px] bg-slate-100 dark:bg-slate-900">
          <div
            key={mobil.id}
            className={clsx(
              'h-[320px] sm:h-[420px] lg:h-[520px]',
              keluar ? 'mobil-keluar' : 'mobil-masuk'
            )}
          >
            <model-viewer
              src={mobil.src}
              alt={`Model 3D ${mobil.name}`}
              // File GLB-nya belasan MB, jadi baru diunduh saat section ini mendekati layar.
              loading="lazy"
              camera-controls
              auto-rotate
              auto-rotate-delay="800"
              rotation-per-second="12deg"
              disable-zoom
              interaction-prompt="none"
              shadow-intensity="1"
              shadow-softness="0.8"
              environment-image="neutral"
              exposure="1.1"
              camera-orbit="-25deg 85deg auto"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          </div>

          <p className="pointer-events-none absolute bottom-5 left-6 text-[13px] text-slate-500 dark:text-slate-400">
            Geser untuk memutar
          </p>
        </div>

        <ul className="space-y-3">
          {CARS.map((c, i) => {
            const on = i === aktif;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pilih(i)}
                  aria-current={on ? 'true' : undefined}
                  className={clsx(
                    'w-full rounded-[20px] border p-5 text-left transition-colors',
                    on
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                  )}
                >
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-60">{c.tagline}</p>
                  <p className="mt-1 text-[19px] font-bold tracking-[-0.01em]">{c.name}</p>
                  <p className="mt-2 text-[14px] opacity-70">{c.spec}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
