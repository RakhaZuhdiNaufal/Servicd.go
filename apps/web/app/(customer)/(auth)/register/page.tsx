'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase-client';

const schema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(8, 'No. HP minimal 8 digit'),
  email: z.string().email('Format email belum benar'),
  password: z.string().min(6, 'Password minimal 6 karakter')
});
type Form = z.infer<typeof schema>;

const inputClass =
  'h-12 w-full rounded-ctl border bg-slate-50/60 px-4 text-base text-slate-900 placeholder:text-slate-400 transition-all focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-600/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-500 dark:focus:bg-slate-900';

function borderFor(error?: FieldError) {
  return error ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700';
}

function FieldMessage({ id, error, hint }: { id: string; error?: FieldError; hint?: string }) {
  if (error) {
    return (
      <p id={id} className="text-sm text-red-700 dark:text-red-300">
        {error.message}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="text-xs text-slate-500 dark:text-slate-400">
        {hint}
      </p>
    );
  }
  return null;
}

const TEXT_FIELDS: Array<{
  id: 'full_name' | 'phone' | 'email';
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
  inputMode?: 'text' | 'tel' | 'email';
  hint?: string;
}> = [
  { id: 'full_name', label: 'Nama lengkap', type: 'text', placeholder: 'Nama sesuai KTP', autoComplete: 'name' },
  {
    id: 'phone',
    label: 'No. HP (WhatsApp)',
    type: 'tel',
    placeholder: '08xxxxxxxxxx',
    autoComplete: 'tel',
    inputMode: 'tel',
    hint: 'Dipakai bengkel untuk mengabari status servis.'
  },
  { id: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com', autoComplete: 'email', inputMode: 'email' }
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit({ email, password, full_name, phone }: Form) {
    setFormError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name, phone } }
      });
      if (error) {
        const msg = error.message?.toLowerCase() ?? '';
        if (error.status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
          setFormError('Terlalu banyak percobaan daftar. Tunggu 1 sampai 2 menit, lalu coba lagi.');
        } else if (msg.includes('already registered') || msg.includes('already exists')) {
          setFormError('Email ini sudah terdaftar. Silakan masuk dengan email tersebut.');
        } else {
          setFormError(error.message);
        }
        return;
      }

      if (data.session?.access_token) {
        await fetch('/api/v1/auth/sync-profile', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ full_name, phone })
        }).catch(() => {});
        // Sesi dari signUp hanya dipakai untuk menyimpan profil di atas; pengguna tetap masuk lewat halaman login.
        await supabase.auth.signOut();
        toast.success('Akun berhasil dibuat. Silakan masuk dengan email dan password kamu.');
        router.replace(`/login?email=${encodeURIComponent(email)}`);
      } else {
        toast.success('Akun berhasil dibuat. Kalau ada email konfirmasi, buka tautannya dulu, lalu masuk.');
        router.replace('/login');
      }
    } catch (err: any) {
      console.error('Register error:', err);
      setFormError(err?.message || 'Server belum bisa dihubungi. Coba lagi sebentar lagi.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[32px] sm:text-[38px] font-bold leading-[1.12] tracking-[-0.02em] text-slate-900 dark:text-white">
          Buat akun ServiceGo
        </h1>
        <p className="text-[16px] leading-relaxed text-slate-600 dark:text-slate-400">
          Satu akun untuk booking servis, menyimpan data kendaraan, dan melihat riwayat.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-ctl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{formError}</p>
          </div>
        )}

        {TEXT_FIELDS.map(({ id, label, type, placeholder, autoComplete, inputMode, hint }) => {
          const error = errors[id];
          const describedBy = error || hint ? `${id}-msg` : undefined;
          return (
            <div key={id} className="space-y-1.5">
              <label htmlFor={id} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                {label}
              </label>
              <input
                id={id}
                type={type}
                autoComplete={autoComplete}
                inputMode={inputMode}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...register(id)}
                className={clsx(inputClass, borderFor(error))}
              />
              <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
            </div>
          );
        })}

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby="password-msg"
              {...register('password')}
              className={clsx(inputClass, 'pr-12', borderFor(errors.password))}
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
          <FieldMessage id="password-msg" error={errors.password} hint="Minimal 6 karakter." />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-ctl bg-primary-600 text-[16px] font-bold text-white shadow-sm hover:bg-primary-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 transition-all"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isSubmitting ? 'Sedang mendaftar...' : 'Buat akun'}
        </button>
      </form>

      <p className="border-t border-slate-200/80 pt-5 text-[15px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
        Sudah punya akun?{' '}
        <Link
          href="/login"
          className="inline-flex min-h-[40px] items-center font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}