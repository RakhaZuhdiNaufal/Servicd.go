'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { btnDanger, btnSecondary, card, h1, h2, lead, pageStack } from '@/components/customer/ui';

/**
 * Pengaturan akun. Menampung hal-hal yang dulu jadi ikon di navbar:
 * ganti tema dan keluar dari akun.
 */

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState<boolean | null>(null);
  const [keluar, setKeluar] = useState(false);

  // Kelas tema dipasang lebih dulu oleh script di app/layout.tsx.
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function pilihTema(mau: boolean) {
    document.documentElement.classList.toggle('dark', mau);
    try {
      localStorage.setItem('sg-theme', mau ? 'dark' : 'light');
    } catch {
      // localStorage bisa diblokir (mode privat); tema tetap berganti untuk sesi ini
    }
    setDark(mau);
  }

  async function handleKeluar() {
    setKeluar(true);
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className={pageStack}>
      <section aria-labelledby="setting-title" className="space-y-6 pt-2 sm:pt-4">
        <div className="max-w-2xl space-y-2">
          <h1 id="setting-title" className={h1}>
            Pengaturan
          </h1>
          <p className={lead}>Atur tampilan aplikasi dan kelola akun kamu di sini.</p>
        </div>

        <div className={clsx(card, 'max-w-2xl divide-y divide-slate-200 dark:divide-slate-800')}>
          <div className="space-y-4 p-6">
            <div className="space-y-1">
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Tampilan</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Pilihan ini tersimpan di perangkat kamu dan tidak ikut setelan sistem.
              </p>
            </div>
            <div role="radiogroup" aria-label="Tema tampilan" className="flex flex-wrap gap-2">
              {[
                { nilai: false, label: 'Terang', Icon: Sun },
                { nilai: true, label: 'Gelap', Icon: Moon }
              ].map(({ nilai, label, Icon }) => {
                const on = dark === nilai;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pilihTema(nilai)}
                    className={clsx(
                      'inline-flex min-h-[44px] items-center gap-2 rounded-ctl border px-4 text-[15px] font-semibold transition-colors',
                      on
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                        : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="space-y-1">
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Akun</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Masuk sebagai {user?.email ?? 'akun kamu'}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/profile" className={btnSecondary}>
                <User className="h-4 w-4" aria-hidden />
                Ubah data profil
              </Link>
              <button type="button" onClick={handleKeluar} disabled={keluar} className={btnDanger}>
                <LogOut className="h-4 w-4" aria-hidden />
                {keluar ? 'Keluar...' : 'Keluar dari akun'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="bantuan-title" className="max-w-2xl space-y-2">
        <h2 id="bantuan-title" className={h2}>
          Butuh bantuan?
        </h2>
        <p className={lead}>
          Ketuk ikon headset di navbar untuk chat langsung dengan CS ServiceGo.
        </p>
      </section>
    </div>
  );
}
