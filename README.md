# ServiceGo — Backend, Database & REST API

Sistem backend & REST API monorepo untuk platform booking servis bengkel **ServiceGo** (Web Admin, Web Pelanggan, & Mobile Pelanggan).

Isi `.env.local` sesuai `.env.example` dengan kredensial Supabase project kamu sendiri sebelum menjalankan `pnpm dev`.

---

## 1. Struktur Monorepo

```
servicego/
├── apps/
│   └── web/                         # Next.js 15 App Router (REST API + UI)
│       ├── app/
│       │   ├── api/v1/              # 24 REST API Route Handlers
│       │   ├── (admin)/layout.tsx   # Placeholder ("Coming soon")
│       │   └── (customer)/layout.tsx# Placeholder ("Coming soon")
│       ├── lib/
│       │   ├── supabase.ts          # Client Supabase (Anon & Service Role)
│       │   ├── auth.ts              # Auth context & resolver
│       │   └── response.ts          # Standar response format { success, data, message }
│       └── middleware.ts            # JWT verification & RBAC enforcement
├── packages/
│   ├── shared/                      # Zod validation schemas, TypeScript types, constants
│   └── database/                    # Prisma 12-table schema, client singleton & seed
├── prisma/                          # Forwarder ke packages/database/prisma/seed.ts
├── turbo.json                       # Turborepo task pipeline
├── pnpm-workspace.yaml              # Workspace definition
└── package.json                     # Monorepo root scripts
```

---

## 2. Checklist Status Verifikasi

### ✅ Kelompok 1: Terverifikasi (Tanpa Perlu Koneksi DB Nyata)
- [x] `pnpm install` berhasil tanpa error di seluruh workspace.
- [x] Skema Prisma 12 tabel valid dan type client ter-generate via `prisma generate`.
- [x] TypeScript type-check & Next.js compilation lolos tanpa error.
- [x] Route group `(admin)` dan `(customer)` tersedia dengan `layout.tsx` placeholder ("Coming soon").
- [x] 24 REST API endpoints terimplementasi lengkap dengan format `{ success, data, message }`.
- [x] Middleware RBAC melindungi endpoint `/api/v1/admin/**` (hanya role `admin`).

---

### 📋 Kelompok 2: Langkah Setelah Isi `.env.local` (Dijalankan Manual oleh Anda)

Setelah Anda membuat project Supabase dan menyalin kredensial ke `.env.local`:

1. **Buat file `.env.local` di root:**
   Salin dari `.env.example` dan isi variabel berikut:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"
   NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
   SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"
   ```

2. **Jalankan Migrasi Database (12 Tabel):**
   ```bash
   pnpm prisma:migrate
   ```
   *Perintah ini akan membuat 12 tabel lengkap dengan relasi, enum, dan unique constraints di database PostgreSQL Supabase Anda.*

3. **Buat User Auth di Supabase Dashboard:**
   - Masuk ke **Supabase Dashboard** -> **Authentication** -> **Users** -> **Add User**.
   - Buat 1 akun Admin (misal: `admin@servicego.id`).
   - Buat 2 akun Customer (misal: `hafiz@customer.id`, `dewi@customer.id`).
   - Salin UUID `User UID` masing-masing akun jika ingin disesuaikan di `packages/database/prisma/seed.ts`.

4. **Jalankan Seed Data:**
   ```bash
   pnpm prisma:seed
   ```
   *Mengisi 1 Cabang Bengkel, 2 Mekanik, 5 Layanan Utama, 3 Profil Pengguna, dan Kendaraan Sampel.*

5. **Jalankan Server Development:**
   ```bash
   pnpm dev
   ```
   Aplikasi Next.js akan berjalan di `http://localhost:3000`.

---

## 3. Daftar REST API Endpoints (`/api/v1`)

Semua response menggunakan format:
```json
{
  "success": true,
  "data": {},
  "message": "Deskripsi status"
}
```

| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| POST | `/api/v1/auth/sync-profile` | Authenticated | Sinkronisasi row `Profile` setelah user signup di Supabase Auth |
| GET | `/api/v1/vehicles` | Customer | Mengambil daftar kendaraan milik user yang sedang login |
| POST | `/api/v1/vehicles` | Customer | Menambahkan kendaraan baru (validasi plat nomor unik) |
| PUT | `/api/v1/vehicles/:id` | Customer (owner) | Memperbarui data kendaraan (cek kepemilikan) |
| DELETE | `/api/v1/vehicles/:id` | Customer (owner) | Menghapus kendaraan (cek kepemilikan) |
| GET | `/api/v1/services` | Public | Menampilkan seluruh layanan aktif (`is_active = true`) |
| POST | `/api/v1/admin/services` | Admin | Menambah layanan servis baru |
| PUT | `/api/v1/admin/services/:id` | Admin | Memperbarui informasi layanan |
| DELETE | `/api/v1/admin/services/:id` | Admin | Soft-delete layanan (`is_active: false`) |
| GET | `/api/v1/bookings/available-slots` | Customer | Cek ketersediaan slot jam berdasarkan tanggal & kapasitas cabang |
| POST | `/api/v1/bookings` | Customer | Transaksi atomic: cek bentrok slot + insert Booking + Services + Status History |
| GET | `/api/v1/bookings` | Customer | Riwayat booking user login beserta relasi kendaraan & layanan |
| GET | `/api/v1/bookings/:id` | Customer/Admin | Detail booking + timeline status history lengkap |
| GET | `/api/v1/admin/bookings` | Admin | Seluruh booking dengan filter status, tanggal, dan pencarian |
| PATCH | `/api/v1/admin/bookings/:id/status` | Admin | Perbarui status pengerjaan + insert audit trail baru ke histori |
| PATCH | `/api/v1/admin/bookings/:id/assign` | Admin | Tugaskan mekanik ke booking (cek ketersediaan mekanik) |
| POST | `/api/v1/admin/bookings/:id/photos` | Admin | Upload foto kondisi check-in / check-out (validasi JPG/PNG maks 2MB) |
| POST | `/api/v1/bookings/:id/review` | Customer | Kirim ulasan dan rating 1-5 (khusus booking berstatus `selesai`) |
| GET | `/api/v1/admin/customers` | Admin | Daftar pelanggan dengan fitur pencarian & pagination |
| POST | `/api/v1/admin/customers` | Admin | Input pelanggan manual (walk-in) |
| PUT | `/api/v1/admin/customers/:id` | Admin | Perbarui informasi data pelanggan |
| DELETE | `/api/v1/admin/customers/:id` | Admin | Hapus data pelanggan |
| GET | `/api/v1/admin/dashboard/summary` | Admin | Agregat metrik: total revenue, booking per status, 5 layanan terlaris |
| GET | `/api/v1/notifications` | Customer/Admin | Daftar notifikasi user login |
| PATCH | `/api/v1/notifications` | Customer/Admin | Tandai semua notifikasi telah dibaca |

---

## 4. Contoh Pengujian Endpoint (cURL)

### Ambil Daftar Layanan (Publik):
```bash
curl -X GET http://localhost:3000/api/v1/services
```

### Cek Ketersediaan Slot Booking:
```bash
curl -X GET "http://localhost:3000/api/v1/bookings/available-slots?date=2026-09-10" \
  -H "Authorization: Bearer <TOKEN_SUPABASE>"
```

### Buat Booking Baru:
```bash
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Authorization: Bearer <TOKEN_CUSTOMER>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "<UUID_VEHICLE>",
    "service_ids": ["<UUID_SERVICE_1>", "<UUID_SERVICE_2>"],
    "scheduled_at": "2026-09-10T09:00:00.000Z",
    "complaint_notes": "Tarikan agak berat dan rem bunyi berdecit"
  }'
```

### Admin Ubah Status Booking:
```bash
curl -X PATCH http://localhost:3000/api/v1/admin/bookings/<BOOKING_ID>/status \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "diproses",
    "note": "Kendaraan mulai dikerjakan di pit 1"
  }'
```
