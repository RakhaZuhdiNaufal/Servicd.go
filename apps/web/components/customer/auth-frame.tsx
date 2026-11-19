import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { ServiceGoAuthLottie } from './servicego-auth-lottie';

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--bg-base)] lg:grid-cols-[1fr_1.12fr]">
      {/* Sisi Kiri: Header, Form, & Footer */}
      <div className="flex min-h-screen flex-col justify-between bg-white px-6 py-6 dark:bg-slate-950 sm:px-12 lg:px-16">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="group flex items-center rounded-chip py-1"
            aria-label="ServiceGo, ke Beranda"
          >
            <img
              src="/logo-servicego-full.png?v=6"
              alt="ServiceGo Logo"
              className="h-11 sm:h-13 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-md"
            />
          </Link>
          <ThemeToggle />
        </header>

        <main id="konten" className="mx-auto my-auto w-full max-w-[420px] py-10">
          {children}
        </main>

        <footer className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-600">
          <span>© 2026 ServiceGo</span>
          <span>Booking &amp; Inspeksi Bengkel</span>
        </footer>
      </div>

      {/* Sisi Kanan: Full-Bleed Dark Studio Stage */}
      <aside
        aria-label="Ilustrasi layanan ServiceGo"
        className="relative hidden overflow-hidden border-l border-slate-200/80 bg-[#0D0F12] dark:border-slate-800/80 lg:flex lg:items-center lg:justify-center"
      >
        {/* Ambient Studio Spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#18202E_0%,#0D0F12_72%)]"
        />

        {/* Subtle Architectural Hairline Frame */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-8 rounded-3xl border border-white/[0.04]"
        />

        {/* Lottie Stage */}
        <div className="relative z-10 flex h-full w-full items-center justify-center p-8">
          <ServiceGoAuthLottie className="h-[540px] w-full max-w-[660px] xl:h-[620px] xl:max-w-[740px]" />
        </div>
      </aside>
    </div>
  );
}