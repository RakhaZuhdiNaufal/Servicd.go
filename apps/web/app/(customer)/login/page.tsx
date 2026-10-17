'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase-client';

const schema = z.object({
  email: z.string().email('Format email belum benar'),
  password: z.string().min(6, 'Password minimal 6 karakter')
});
type Form = z.infer<typeof schema>;

/** Pesan Supabase yang umum, diterjemahkan supaya jelas untuk pelanggan. */
function loginErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email atau password salah. Cek lagi lalu coba masuk.';
  if (m.includes('email not confirmed'))
    return 'Email kamu belum dikonfirmasi. Buka tautan konfirmasi di email dulu, lalu masuk.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  return message;
}

const inputClass =
  'h-12 w-full rounded-ctl border bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 transition-colors dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Hanya untuk teks penjelas: datang dari form booking (?redirect=/booking/...)?
  const [fromBooking, setFromBooking] = useState(false);
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('redirect');
    setFromBooking(!!target && target.startsWith('/booking'));
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit({ email, password }: Form) {
    setFormError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setFormError(loginErrorMessage(error.message));
        return;
      }
      // Kembali ke halaman asal (misal form booking) kalau ada ?redirect=, hanya path internal.
      const target = new URLSearchParams(window.location.search).get('redirect');
      const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
      router.replace(safe);
    } catch (err: any) {
      setFormError(err?.message || 'Server belum bisa dihubungi. Coba lagi sebentar lagi.');
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.1] tracking-[-0.015em] text-slate-900 dark:text-white">Masuk ke ServiceGo</h1>
        <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
          {fromBooking
            ? 'Masuk dulu untuk menyelesaikan booking. Setelah masuk, kamu langsung kembali ke form booking.'
            : 'Masuk untuk booking servis dan cek status kendaraan kamu.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        {formError && (
          <div
            role="alert"
            className="flex gap-2 rounded-ctl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{formError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nama@email.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
            className={clsx(
              inputClass,
              errors.email ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'
            )}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-700 dark:text-red-300">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
              className={clsx(
                inputClass,
                'pr-12',
                errors.password ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
              aria-pressed={showPw}
              className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-ctl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-sm text-red-700 dark:text-red-300">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-ctl bg-primary-600 text-[17px] font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isSubmitting ? 'Sedang masuk...' : 'Masuk'}
        </button>
      </form>

      <p className="border-t border-slate-200 pt-6 text-[15px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
        Belum punya akun?{' '}
        <Link
          href="/register"
          className="inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline dark:text-primary-100"
        >
          Daftar di sini
        </Link>
      </p>
    </div>
  );
}
