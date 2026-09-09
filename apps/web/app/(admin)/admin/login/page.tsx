'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { Eye, EyeOff, Wrench } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter')
});
type Form = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit({ email, password }: Form) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace('/admin/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-primary-900 text-white w-1/2 px-16 gap-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Wrench className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold">ServiceGo</span>
        </div>
        <h1 className="text-4xl font-extrabold leading-tight text-center">
          Precision &amp; Control<br />untuk Tim Bengkel
        </h1>
        <p className="text-primary-200 text-center max-w-xs">
          Kelola booking, pantau status servis, dan koordinasi mekanik — semua dari satu dashboard.
        </p>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center bg-[var(--bg-base)] px-6">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg shadow-md p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Masuk Admin</h2>
            <p className="text-sm text-slate-500 mt-1">Gunakan akun admin bengkel Anda</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                placeholder="admin@bengkel.id"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Masuk…' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
