# 🚀 ServiceGo — Modern Workshop & Service Booking Platform

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=for-the-badge&logo=turborepo)](https://turbo.build/)

**Sistem Manajemen Bengkel & Platform Booking Servis Kendaraan End-to-End**  
*Mendigitalkan alur booking manual menjadi terintegrasi, transparan, dan real-time bagi Admin Bengkel dan Pelanggan.*

[Fitur Utama](#-fitur-utama) • [Arsitektur Monorepo](#-arsitektur-monorepo) • [Tech Stack](#-tech-stack) • [Panduan Instalasi](#-panduan-instalasi--setup) • [REST API Reference](#-spesifikasi-rest-api)

</div>

---

## 📖 Tentang ServiceGo

**ServiceGo** menggantikan proses booking bengkel konvensional (telepon, WhatsApp manual, atau datang langsung yang rawan antrean panjang dan jadwal bentrok) dengan alur digital yang efisien:

- **Bagi Pelanggan**: Pemilihan layanan mandiri, pengecekan slot waktu real-time yang akurat, pemesanan multi-tahap (6 langkah), hingga pemantauan status pengerjaan kendaraan secara *live* tanpa perlu refresh browser.
- **Bagi Admin Bengkel**: Satu dashboard komprehensif untuk memantau kapasitas bengkel, metrik performa & pendapatan, manajemen antrian servis dengan tampilan **Tabel & Kanban Drag-and-Drop**, penugasan mekanik, dan dokumentasi foto kondisi kendaraan.

---

## ✨ Fitur Utama

### 🚗 Portal Web Pelanggan (`/*`)
- **Beranda Interaktif**: Akses cepat booking servis, karosel kendaraan tersimpan, dan katalog layanan servis berkala.
- **Formulir Booking 6-Tahap**:
  1. Pilih Kendaraan (terdaftar atau tambah baru langsung di tempat)
  2. Pilih Jenis Layanan Servis
  3. Pilih Jadwal & Slot Waktu yang tersedia (tervalidasi anti-bentrok)
  4. Keluhan & Catatan Tambahan
  5. Ringkasan & Estimasi Biaya
  6. Konfirmasi Pemesanan
- **Real-time Tracking Servis**: Timeline visual tahapan servis (`Menunggu` → `Diproses` → `Selesai`) yang otomatis ter-update secara *live* via **Supabase Realtime**.
- **Riwayat & Filter**: Daftar riwayat servis kendaraan dengan filter chip status pengerjaan.
- **Review & Rating**: Form ulasan kepuasan pelanggan dan rating bintang 1–5 untuk servis yang telah selesai.
- **Pusat Notifikasi**: Notifikasi in-app untuk pembaruan status pengerjaan & pengingat jadwal servis.
- **Manajemen Profil & Kendaraan**: CRUD lengkap data kendaraan (Nomor Plat, Merk, Model, Tipe Kendaraan, Foto STNK/Kendaraan).

### 🛠️ Portal Web Admin (`/admin/*`)
- **Dashboard Analitik**: Kartu KPI (Total Pelanggan, Total Kendaraan, Booking Menunggu, Total Revenue) dan grafik batang interaktif (Recharts) untuk distribusi status servis serta daftar layanan terlaris.
- **Papan Kerja Booking (Tabel & Kanban)**:
  - Toggle tampilan antara Data Table paginasi dan Kanban Board interaktif (@hello-pangea/dnd).
  - Perpindahan status servis secara drag-and-drop antar kolom status.
  - Slide-over Sheet detail booking pelanggan, kendaraan, dan layanan yang dipilih.
  - Penugasan mekanik (*assign mechanic*) dan input log catatan pengerjaan.
- **Global Command Palette (`Ctrl + K` / `⌘K`)**: Navigasi dan pencarian instan data booking berdasarkan nama pelanggan atau nomor plat kendaraan.
- **Manajemen Pelanggan**: Data table pencarian pelanggan, riwayat kendaraan, dan fitur input pelanggan walk-in.
- **Katalog Layanan**: Manajemen tarif, durasi pengerjaan, deskripsi, dan status aktif layanan bengkel.

### ⚙️ Backend Engine & Keamanan
- **24 Endpoint REST API Terstruktur**: Memenuhi standar respons `{ success, data, message }`.
- **Integritas Data Relasional**: Transaksi atomic Prisma untuk mencegah *double booking* pada slot waktu dan kapasitas yang sama.
- **Dual-Layer Authentication**: Supabase Auth (JWT) dipadukan dengan RBAC (*Role-Based Access Control*) di level Middleware Next.js dan Layout Guards.
- **Shared Type-Safety**: Validasi input berbasis Zod di backend dan frontend berasal dari single source of truth (`packages/shared`).

---

## 🏗️ Arsitektur Monorepo

Project ini dibangun dengan arsitektur monorepo modular menggunakan **Turborepo** dan **pnpm workspaces**:

```
servicego/
├── apps/
│   └── web/                         # Next.js 15 App Router (Frontend Web + REST API)
│       ├── app/
│       │   ├── (admin)/admin/       # Web Admin Pages (/admin/dashboard, /admin/bookings, dll)
│       │   ├── (customer)/          # Web Pelanggan Pages (/, /booking/new, /bookings, dll)
│       │   └── api/v1/              # 24 REST API Route Handlers
│       ├── components/
│       │   ├── admin/               # AdminShell, CommandPalette, Kanban
│       │   ├── customer/            # CustomerShell, BookingWizard, TrackingTimeline
│       │   ├── ui/                  # Primitif Komponen shadcn/ui
│       │   └── status-badge.tsx     # StatusBadge serbaguna
│       ├── lib/
│       │   ├── auth-context.tsx     # React Context Autentikasi
│       │   ├── fetcher.ts           # Axios/Fetch wrapper dengan auto-bearer token
│       │   └── supabase-client.ts   # Browser Supabase Client
│       └── middleware.ts            # JWT Authentication & RBAC Enforcement
├── packages/
│   ├── shared/                      # Zod validation schemas, TypeScript interfaces & konstanta
│   └── database/                    # Skema Prisma (12 tabel), database client singleton & seed
├── turbo.json                       # Konfigurasi pipeline build & task Turborepo
├── pnpm-workspace.yaml              # Definisi paket monorepo
└── package.json                     # Root scripts & tooling dependencies
```

---

## 💻 Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Frontend Framework** | Next.js 15 (App Router, React 19) | Server Components, Route Groups, Nested Layouts |
| **Monorepo Engine** | Turborepo + pnpm | Pipeline caching, zero-overhead task execution |
| **Bahasa Pemrograman** | TypeScript 5.7 (Strict Mode) | Full type-safety end-to-end |
| **Styling & UI Tokens** | Tailwind CSS v3 + shadcn/ui | Design tokens adaptif, Plus Jakarta Sans, JetBrains Mono |
| **Icons & Visuals** | Lucide React | Clean, scalable vector icons |
| **State & Data Fetching**| TanStack Query v5 (React Query) | Caching, optimistik update, background refetch |
| **Form & Validasi** | React Hook Form + Zod Resolvers | Validasi form sinkron antara client dan API |
| **Charts & Drag-Drop** | Recharts & @hello-pangea/dnd | Visualisasi analitik & Kanban board interaktif |
| **Database & ORM** | PostgreSQL (Supabase) + Prisma ORM | 12 Tabel relasional, migrations, atomic transactions |
| **Auth & Realtime** | Supabase Auth & Supabase Realtime | JWT Session, Role claims, Live WebSocket subscriptions |

---

## 🚀 Panduan Instalasi & Setup

### Prasyarat Sistem
- **Node.js**: Versi `>= 18.18.0` atau `>= 20.x`
- **Package Manager**: `pnpm` (disarankan `pnpm@9+` atau `pnpm@10+`)
- **Database**: Instance PostgreSQL / Supabase project aktif

### 1. Kloning Repository
```bash
git clone https://github.com/apisang/servicego.git
cd servicego
```

### 2. Instalasi Dependensi
```bash
pnpm install
```

### 3. Konfigurasi Environment Variables
Salin contoh file environment ke root project:
```bash
cp .env.example .env.local
```
Buka `.env.local` dan lengkapi konfigurasi Supabase Anda:
```env
# Database Direct & Pooler Connection (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"

# Supabase Auth & Realtime Credentials
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 4. Setup Database & Seed Data
Generate Prisma Client, terapkan migrasi schema, dan jalankan data awal:
```bash
# Generate Prisma types
pnpm prisma:generate

# Terapkan migrasi 12 tabel ke database Supabase
pnpm prisma:migrate

# Jalankan seeder (Cabang, Layanan Default, Mekanik, Sampel Kendaraan)
# Ditolak bila NODE_ENV=production (kecuali ALLOW_SEED=1).
pnpm prisma:seed
```

**Wajib: kebijakan keamanan Supabase.** Browser memegang anon key yang publik, jadi tanpa RLS semua tabel bisa dibaca/diubah lewat REST Supabase. Setelah migrasi, jalankan berurutan di Supabase SQL Editor (keduanya aman dijalankan ulang):
1. `supabase/rls_core.sql`: RLS semua tabel inti + Realtime `bookings`.
2. `supabase/support_chat.sql`: tabel, trigger, RPC, RLS, dan Realtime Live CS.

### 5. Menjalankan Server Development
```bash
pnpm dev
```
Buka browser Anda di:
- **Web Pelanggan**: [http://localhost:3001/](http://localhost:3001/)
- **Web Admin**: [http://localhost:3001/admin](http://localhost:3001/admin) (Login: `/admin/login`)

---

## 📡 Spesifikasi REST API

Seluruh endpoint beralamat di base URL `/api/v1` dan mengembalikan respons dengan format standar:

```json
{
  "success": true,
  "data": { ... },
  "message": "Deskripsi status operasi"
}
```

### Ringkasan Rute API:

| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `POST` | `/api/v1/auth/sync-profile` | Authenticated | Sinkronisasi profile setelah user mendaftar di Supabase Auth |
| `GET` | `/api/v1/services` | Publik | Katalog seluruh layanan aktif bengkel |
| `GET` | `/api/v1/vehicles` | Customer | Daftar kendaraan milik pelanggan |
| `POST` | `/api/v1/vehicles` | Customer | Mendaftarkan kendaraan baru |
| `PUT` | `/api/v1/vehicles/:id` | Customer (Owner) | Memperbarui informasi kendaraan |
| `DELETE` | `/api/v1/vehicles/:id` | Customer (Owner) | Menghapus data kendaraan |
| `GET` | `/api/v1/bookings/available-slots` | Customer | Cek slot jadwal servis tersedia berdasarkan tanggal |
| `POST` | `/api/v1/bookings` | Customer | Transaksi atomic booking servis baru |
| `GET` | `/api/v1/bookings` | Customer | Riwayat booking servis pelanggan |
| `GET` | `/api/v1/bookings/:id` | Customer/Admin | Detail pengerjaan servis beserta riwayat status |
| `POST` | `/api/v1/bookings/:id/review` | Customer | Mengirim ulasan & rating untuk servis yang selesai |
| `GET` | `/api/v1/admin/dashboard/summary` | Admin | Ringkasan metrik analitik pendapatan, booking, & layanan |
| `GET` | `/api/v1/admin/bookings` | Admin | Daftar seluruh booking (filter status, tanggal, search) |
| `PATCH` | `/api/v1/admin/bookings/:id/status` | Admin | Memperbarui tahapan status servis |
| `PATCH` | `/api/v1/admin/bookings/:id/assign` | Admin | Menugaskan mekanik penanggung jawab |
| `POST` | `/api/v1/admin/bookings/:id/photos` | Admin | Unggah dokumentasi foto check-in / check-out |
| `GET` | `/api/v1/admin/customers` | Admin | Daftar pelanggan bengkel dengan paginasi |
| `POST` | `/api/v1/admin/customers` | Admin | Pendaftaran pelanggan walk-in manual oleh kasir/admin |
| `GET` | `/api/v1/admin/services` | Admin | Manajemen seluruh katalog layanan servis |
| `POST` | `/api/v1/admin/services` | Admin | Menambahkan jenis layanan servis baru |
| `PUT` | `/api/v1/admin/services/:id` | Admin | Mengubah informasi tarif/layanan |
| `DELETE` | `/api/v1/admin/services/:id` | Admin | Soft-delete status aktif layanan |
| `GET` | `/api/v1/notifications` | Customer/Admin | Daftar notifikasi pengguna |
| `PATCH` | `/api/v1/notifications` | Customer/Admin | Menandai seluruh notifikasi telah dibaca |

---

## 📜 Skrip NPM yang Tersedia

Jalankan perintah berikut dari root direktori:

- `pnpm dev` : Menjalankan development server seluruh workspace secara paralel via Turborepo.
- `pnpm build` : Memvalidasi tipe dan mengompilasi production build seluruh aplikasi.
- `pnpm check-types` : Menjalankan pengecekan tipe TypeScript (`tsc --noEmit`) pada semua paket.
- `pnpm prisma:generate` : Men-generate Prisma Client pada `@servicego/database`.
- `pnpm prisma:migrate` : Menjalankan migrasi database ke Supabase PostgreSQL.
- `pnpm prisma:seed` : Menjalankan data seeder default.
- `pnpm prisma:studio` : Membuka GUI interaktif Prisma Studio untuk inspeksi database.

---

## 🔒 Keamanan & Praktik Terbaik

1. **Prinsip Validasi Ketat**: Setiap payload request di-validasi pada trust boundary menggunakan Zod schema sebelum menyentuh lapisan database.
2. **Kerahasiaan Kredensial**: File `.env.local` dikecualikan secara ketat pada `.gitignore`. Kunci *service-role* Supabase hanya boleh diakses di sisi server (Route Handlers & Middleware).
3. **Pemberitahuan Gap Endpoint**: Sesuai prinsip rekayasa perangkat lunak yang transparan, halaman yang memerlukan endpoint tambahan (misal daftar mekanik atau daftar seluruh kendaraan pelanggan) diberi penanda catatan gap tanpa mengubah kontrak API yang telah disepakati.

---

<div align="center">

Dibuat dengan dedikasi untuk keunggulan operasional bengkel modern.  
**ServiceGo Team © 2026**

</div>
