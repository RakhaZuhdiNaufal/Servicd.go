'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';

const schema = z.object({
  email: z.string().email('Format email belum benar'),
  password: z.string().min(6, 'Password minimal 6 karakter')
});
type Form = z.infer<typeof schema>;

const input =
  'h-11 w-full rounded-ctl border bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-500 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 transition-colors';

function friendlyAuthError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return 'Email atau password salah.';
  if (/email not confirmed/i.test(msg)) return 'Email akun ini belum dikonfirmasi.';
  if (/fetch|network/i.test(msg)) return 'Tidak bisa terhubung ke server. Cek koneksi internet.';
  if (/rate limit|too many/i.test(msg)) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  return msg;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, role, loading } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Form>({ resolver: zodResolver(schema) });

  // Admin yang sudah masuk langsung diarahkan ke dashboard
  useEffect(() => {
    if (!loading && session && role === 'admin') router.replace('/admin/dashboard');
  }, [loading, session, role, router]);

  async function onSubmit({ email, password }: Form) {
    setFormError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFormError(friendlyAuthError(error.message));
      return;
    }
    // Role dari app_metadata (diisi server). Akun pelanggan tidak diteruskan ke panel admin.
    if (data.user?.app_metadata?.role === 'customer') {
      await supabase.auth.signOut();
      setFormError('Akun ini akun pelanggan, bukan akun admin. Pelanggan masuk lewat halaman Masuk biasa.');
      return;
    }
    router.replace('/admin/dashboard');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-chip bg-primary-600 text-white">
            <Wrench className="h-4 w-4" aria-hidden />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">
              Service<span className="text-primary-600 dark:text-primary-500">Go</span>
            </span>
            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">Admin</span>
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px] space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Masuk ke panel admin</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Khusus staf bengkel ServiceGo untuk mengelola booking, mekanik, dan chat pelanggan.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className={clsx(input, errors.email ? 'border-red-600 dark:border-red-500' : 'border-slate-300 dark:border-slate-700')}
                placeholder="nama@bengkel.id"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-[13px] text-red-700 dark:text-red-300">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                  className={clsx(input, 'pr-12', errors.password ? 'border-red-600 dark:border-red-500' : 'border-slate-300 dark:border-slate-700')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPw}
                  className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-ctl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-[13px] text-red-700 dark:text-red-300">{errors.password.message}</p>
              )}
            </div>

            {formError && (
              <p role="alert" className="rounded-ctl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-ctl bg-primary-600 text-[15px] font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Memeriksa akun...' : 'Masuk'}
            </button>
          </form>

          <p className="border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
            Pelanggan?{' '}
            <Link href="/login" className="font-semibold text-primary-700 hover:underline dark:text-primary-100">
              Masuk di portal pelanggan
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
