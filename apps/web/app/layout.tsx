import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'ServiceGo — Booking Servis Kendaraan',
  description: 'Booking servis kendaraan online, tracking real-time, riwayat servis lengkap.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
