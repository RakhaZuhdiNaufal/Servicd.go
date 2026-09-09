'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(8, 'No. HP tidak valid'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter')
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema)
  });

  async function onSubmit({ email, password, full_name, phone }: Form) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, phone } }
    });
    if (error) { toast.error(error.message); return; }

    // Sync profile immediately after signup
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch('/api/v1/auth/sync-profile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    toast.success('Akun berhasil dibuat! Selamat datang di ServiceGo.');
    router.replace('/');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buat Akun</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar gratis, booking kapan saja</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          {[
            { id: 'full_name', label: 'Nama Lengkap', type: 'text', placeholder: 'Budi Santoso', autocomplete: 'name' },
            { id: 'phone', label: 'No. HP', type: 'tel', placeholder: '0812xxxxxxx', autocomplete: 'tel' },
            { id: 'email', label: 'Email', type: 'email', placeholder: 'email@kamu.com', autocomplete: 'email' }
          ].map(({ id, label, type, placeholder, autocomplete }) => (
            <div key={id} className="space-y-1">
              <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
              <input
                id={id}
                type={type}
                autoComplete={autocomplete}
                {...register(id as keyof Form)}
                placeholder={placeholder}
                className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors[id as keyof typeof errors] && (
                <p className="text-xs text-red-500">{errors[id as keyof typeof errors]?.message as string}</p>
              )}
            </div>
          ))}

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('password')}
                placeholder="min. 6 karakter"
                className="w-full rounded-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2.5 text-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Mendaftar…' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-primary-600 font-semibold hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
