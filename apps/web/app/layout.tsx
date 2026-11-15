import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

// Plus Jakarta Sans: typeface buatan Tokotype (Jakarta), ramah & mudah dibaca di layar kecil. Lihat DESIGN.md.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'], // 800 = font-extrabold (judul)
  variable: '--font-sans',
  display: 'swap'
});

// JetBrains Mono khusus plat nomor & kode booking (0/O dan 1/I tidak tertukar).
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'ServiceGo: Booking Servis Kendaraan',
  description: 'Booking servis kendaraan online, pantau status pengerjaan, dan simpan riwayat servis.'
};

// Pasang class tema sebelum halaman tampil supaya tidak berkedip saat mode gelap.
const themeScript = `(function(){try{var t=localStorage.getItem('sg-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${jakarta.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
