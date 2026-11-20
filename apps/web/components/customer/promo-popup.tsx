'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

/**
 * Iklan promo yang muncul setelah pelanggan masuk, paling sering sebulan sekali.
 *
 * Tanggal tampil terakhir disimpan di perangkat (localStorage), bukan di server:
 * promonya sama untuk semua orang, jadi tidak perlu dicatat per akun di database.
 */

const KUNCI = 'sg-promo-terakhir';
const JEDA_HARI = 30;

function bolehTampil() {
  try {
    const terakhir = localStorage.getItem(KUNCI);
    if (!terakhir) return true;
    const selisihHari = (Date.now() - Number(terakhir)) / 86_400_000;
    return !Number.isFinite(selisihHari) || selisihHari >= JEDA_HARI;
  } catch {
    // localStorage bisa diblokir (mode privat): jangan munculkan iklan berulang kali.
    return false;
  }
}

function catatSudahTampil() {
  try {
    localStorage.setItem(KUNCI, String(Date.now()));
  } catch {
    // diabaikan; paling banter iklannya muncul lagi di kunjungan berikutnya
  }
}

export function PromoPopup() {
  const [buka, setBuka] = useState(false);
  const tombolTutup = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!bolehTampil()) return;
    // Beri jeda sebentar supaya halaman sempat tampil dulu, tidak menimpa saat masih memuat.
    const t = setTimeout(() => {
      setBuka(true);
      catatSudahTampil();
    }, 900);
    return () => clearTimeout(t);
  }, []);

  // Esc menutup, dan selama terbuka halaman di belakang tidak ikut tergulir.
  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBuka(false);
    };
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    tombolTutup.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowLama;
    };
  }, [buka]);

  if (!buka) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Promo pengguna awal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Tutup iklan"
        tabIndex={-1}
        onClick={() => setBuka(false)}
        className="absolute inset-0 cursor-default bg-slate-950/70"
      />

      <div className="muncul-halus relative w-full max-w-3xl">
        <div className="relative overflow-hidden rounded-[20px]">
          <img
            src="/images/promo-pengguna-awal.webp"
            alt="Promo pengguna awal: diskon spesial untuk servis minimal Rp 250.000."
            className="block w-full"
          />

          {/* Tombol asli ditumpuk tepat di atas tombol yang tergambar, jadi benar-benar bisa
              ditekan (dan terbaca pembaca layar) tanpa mengubah desain bannernya. */}
          <Link
            href="/booking/new"
            onClick={() => setBuka(false)}
            aria-label="Booking sekarang"
            className="absolute left-[4.5%] top-[82%] h-[11%] w-[27%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
        </div>

        <button
          ref={tombolTutup}
          type="button"
          onClick={() => setBuka(false)}
          aria-label="Tutup iklan"
          className="absolute -right-2 -top-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
