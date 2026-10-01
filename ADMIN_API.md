# 📖 Daftar REST API Role Admin (ServiceGo)

Dokumen ini merangkum seluruh endpoint API untuk **Role Admin**, interaksi **Admin ➔ User / Pelanggan**, file controller backend, serta halaman Frontend (UI) tempat fitur tersebut digunakan.

---

## 🔑 Informasi Dasar & Autentikasi
- **Base URL:** `/api/v1`
- **Header Autentikasi:** `Authorization: Bearer <supabase_jwt_token>`
- **Role Requirement:** `admin` (diverifikasi melalui Supabase Auth & Next.js middleware)
- **Format Response Konsisten:**
  ```json
  {
    "success": true,
    "data": {},
    "message": "Pesan status"
  }
  ```

---

## 1. Modul Dashboard & Statistik
Menyediakan ringkasan performa bisnis bengkel, KPI, grafik, dan riwayat aktivitas terkini.

### `GET /api/v1/admin/dashboard/summary`
- **Deskripsi:** Mengambil KPI cards, statistik status booking untuk grafik chart, 5 layanan terlaris, dan 5 booking terbaru.
- **Query Params:** Tidak ada
- **Backend File:** [`apps/web/app/api/v1/admin/dashboard/summary/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/dashboard/summary/route.ts)
- **Frontend Page (UI):** [`/admin/dashboard`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/dashboard/page.tsx) (`http://localhost:3000/admin/dashboard`)
- **Contoh Response Data:**
  ```json
  {
    "total_revenue": 14500000,
    "total_customers": 48,
    "total_vehicles": 62,
    "bookings_by_status": {
      "menunggu": 3,
      "diproses": 5,
      "selesai": 38,
      "dibatalkan": 2
    },
    "top_services": [
      { "service_id": "uuid", "name": "Servis Rutin / Tune-up", "total_bookings": 18, "total_revenue": 4500000 }
    ],
    "recent_bookings": [...]
  }
  ```

---

## 2. Modul Booking & Kanban (Admin ➔ Booking Pelanggan)
Memproses antrean booking pengerjaan kendaraan pelanggan, penugasan teknisi, dan dokumentasi foto.

### `GET /api/v1/admin/bookings`
- **Deskripsi:** Mengambil seluruh daftar booking dengan opsi pencarian, filter status/tanggal, dan paginasi.
- **Query Params:**
  - `status`: `menunggu` | `diproses` | `selesai` | `dibatalkan` (opsional)
  - `start_date`: format `YYYY-MM-DD` (opsional)
  - `end_date`: format `YYYY-MM-DD` (opsional)
  - `search`: string nama pelanggan atau nomor plat (opsional)
  - `page`: nomor halaman (default: `1`)
  - `limit`: jumlah data per halaman (default: `20`)
- **Backend File:** [`apps/web/app/api/v1/admin/bookings/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/bookings/route.ts)
- **Frontend Page (UI):** [`/admin/bookings`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/bookings/page.tsx) (`http://localhost:3000/admin/bookings`)

### `PATCH /api/v1/admin/bookings/:id/status`
- **Deskripsi:** Mengubah status booking pengerjaan kendaraan pelanggan. Mencatat riwayat ke `booking_status_history` dan mengirim push notifikasi ke akun pelanggan.
- **Request Body:**
  ```json
  {
    "status": "diproses", // "menunggu" | "diproses" | "selesai" | "dibatalkan"
    "note": "Kendaraan mulai dikerjakan di pit 2" // opsional
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/bookings/[id]/status/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/bookings/[id]/status/route.ts)
- **Frontend Page (UI):** Di dalam Sheet Detail booking pada [`/admin/bookings`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/bookings/page.tsx) atau via drag-drop kartu Kanban.

### `PATCH /api/v1/admin/bookings/:id/assign`
- **Deskripsi:** Menugaskan (assign) teknisi mekanik ke booking tertentu. Memvalidasi bahwa mekanik aktif dan tidak bentrok jadwal di jam yang sama.
- **Request Body:**
  ```json
  {
    "mechanic_id": "22222222-2222-2222-2222-222222222221"
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/bookings/[id]/assign/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/bookings/[id]/assign/route.ts)
- **Frontend Page (UI):** Dropdown pilihan mekanik pada Sheet Detail [`/admin/bookings`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/bookings/page.tsx).

### `POST /api/v1/admin/bookings/:id/photos`
- **Deskripsi:** Mengunggah foto kondisi fisik kendaraan (tahap check-in saat kendaraan baru masuk atau check-out pasca servis selesai).
- **Content-Type:** `multipart/form-data`
- **Form Data:**
  - `file`: File gambar JPG/PNG (maksimal 2MB)
  - `stage`: `checkin` | `checkout`
  - `caption`: Keterangan catatan kondisi fisik (opsional)
- **Backend File:** [`apps/web/app/api/v1/admin/bookings/[id]/photos/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/bookings/[id]/photos/route.ts)
- **Frontend Page (UI):** Form upload foto kondisi pada Sheet Detail [`/admin/bookings`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/bookings/page.tsx).

---

## 3. Modul Pelanggan (Admin ➔ User / Customer)
Manajemen akun pelanggan bengkel, registrasi walk-in, dan riwayat pelanggan.

### `GET /api/v1/admin/customers`
- **Deskripsi:** Mengambil list seluruh pelanggan terdaftar, jumlah kendaraan milik mereka, dan total booking yang pernah dibuat.
- **Query Params:**
  - `search`: cari nama, nomor HP, atau email
  - `page`: nomor halaman (default: `1`)
  - `limit`: limit data (default: `20`)
- **Backend File:** [`apps/web/app/api/v1/admin/customers/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/customers/route.ts)
- **Frontend Page (UI):** [`/admin/customers`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/customers/page.tsx) (`http://localhost:3000/admin/customers`)

### `POST /api/v1/admin/customers`
- **Deskripsi:** Admin mendaftarkan akun pelanggan baru yang datang langsung ke bengkel (walk-in).
- **Request Body:**
  ```json
  {
    "full_name": "Bambang Pamungkas",
    "phone": "081298765432",
    "email": "bambang@gmail.com"
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/customers/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/customers/route.ts)
- **Frontend Page (UI):** Modal dialog `+ Tambah Pelanggan` pada [`/admin/customers`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/customers/page.tsx).

### `PUT /api/v1/admin/customers/:id`
- **Deskripsi:** Memperbarui data profil pelanggan (nama, nomor telepon).
- **Request Body:**
  ```json
  {
    "full_name": "Bambang Pamungkas Updated",
    "phone": "081299998888"
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/customers/[id]/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/customers/[id]/route.ts)
- **Frontend Page (UI):** Tombol edit profil pada Sheet detail pelanggan di [`/admin/customers`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/customers/page.tsx).

### `DELETE /api/v1/admin/customers/:id`
- **Deskripsi:** Menghapus data akun pelanggan dari sistem.
- **Backend File:** [`apps/web/app/api/v1/admin/customers/[id]/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/customers/[id]/route.ts)
- **Frontend Page (UI):** Tombol Hapus pada Sheet detail pelanggan di [`/admin/customers`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/customers/page.tsx).

---

## 4. Modul Kendaraan Pelanggan (Admin ➔ Kendaraan User)
Melihat data seluruh kendaraan roda 4 dan roda 2 milik pelanggan yang terdaftar di bengkel.

### `GET /api/v1/admin/vehicles`
- **Deskripsi:** List seluruh armada kendaraan pelanggan (merk, model, tahun, plat nomor, angka odometer KM, identitas pemilik, dan tanggal booking terakhir).
- **Query Params:**
  - `search`: nomor plat kendaraan, merk, model, nama pemilik, atau nomor telepon
  - `vehicle_type`: `mobil` | `motor` (opsional)
  - `page`: nomor halaman (default: `1`)
  - `limit`: limit data (default: `15`)
- **Backend File:** [`apps/web/app/api/v1/admin/vehicles/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/vehicles/route.ts)
- **Frontend Page (UI):** [`/admin/vehicles`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/vehicles/page.tsx) (`http://localhost:3000/admin/vehicles`)

---

## 5. Modul Layanan Bengkel
Mengelola katalog jasa servis, tarif harga, dan durasi kerja.

### `GET /api/v1/services`
- **Deskripsi:** List katalog seluruh layanan bengkel (aktif untuk dipilih pelanggan maupun dikelola admin).
- **Backend File:** [`apps/web/app/api/v1/services/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/services/route.ts)
- **Frontend Page (UI):** [`/admin/services`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/services/page.tsx) (`http://localhost:3000/admin/services`)

### `POST /api/v1/admin/services`
- **Deskripsi:** Menambahkan jenis layanan servis baru ke sistem bengkel.
- **Request Body:**
  ```json
  {
    "name": "Flushing AC & Evaporator Clean",
    "description": "Pembersihan evaporator AC, filter kabin, dan pengisian freon R134a",
    "price": 350000,
    "duration_minutes": 60,
    "is_active": true
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/services/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/services/route.ts)
- **Frontend Page (UI):** Modal dialog `+ Tambah Layanan` pada [`/admin/services`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/services/page.tsx).

### `PUT /api/v1/admin/services/:id`
- **Deskripsi:** Memperbarui data tarif harga, durasi pengerjaan, atau nama layanan.
- **Request Body:**
  ```json
  {
    "price": 375000,
    "duration_minutes": 60
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/services/[id]/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/services/[id]/route.ts)
- **Frontend Page (UI):** Modal dialog Edit pada [`/admin/services`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/services/page.tsx).

### `DELETE /api/v1/admin/services/:id`
- **Deskripsi:** Soft-delete layanan (menyetel `is_active = false`) agar tidak merusak data transaksi historis.
- **Backend File:** [`apps/web/app/api/v1/admin/services/[id]/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/services/[id]/route.ts)
- **Frontend Page (UI):** Tombol Hapus pada kartu layanan di [`/admin/services`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/services/page.tsx).

---

## 6. Modul Mekanik Bengkel
Manajemen staf teknisi bengkel, spesialisasi, penempatan cabang, dan alokasi tugas aktif.

### `GET /api/v1/admin/mechanics`
- **Deskripsi:** Mengambil daftar seluruh teknisi, keahlian, cabang tempat bertugas, dan counter pengerjaan booking yang sedang aktif (`active_jobs_count`).
- **Query Params:**
  - `branch_id`: filter ID cabang bengkel (opsional)
  - `is_active`: `true` | `false` (opsional)
- **Backend File:** [`apps/web/app/api/v1/admin/mechanics/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/mechanics/route.ts)
- **Frontend Page (UI):** [`/admin/mechanics`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/mechanics/page.tsx) (`http://localhost:3000/admin/mechanics`)

### `POST /api/v1/admin/mechanics`
- **Deskripsi:** Mendaftarkan mekanik baru ke cabang bengkel.
- **Request Body:**
  ```json
  {
    "branch_id": "11111111-1111-1111-1111-111111111111",
    "full_name": "Rian Hidayat",
    "specialty": "Kelistrikan & ECU Tuning",
    "is_active": true
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/mechanics/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/mechanics/route.ts)
- **Frontend Page (UI):** Modal dialog `+ Tambah Mekanik` pada [`/admin/mechanics`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/mechanics/page.tsx).

### `PUT /api/v1/admin/mechanics/:id`
- **Deskripsi:** Memperbarui data teknisi, keahlian spesialisasi, penempatan cabang, atau toggle status keaktifan.
- **Request Body:**
  ```json
  {
    "specialty": "Mesin Diesel & Common Rail",
    "is_active": true
  }
  ```
- **Backend File:** [`apps/web/app/api/v1/admin/mechanics/[id]/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/mechanics/[id]/route.ts)
- **Frontend Page (UI):** Modal dialog Edit pada [`/admin/mechanics`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/mechanics/page.tsx).

### `DELETE /api/v1/admin/mechanics/:id`
- **Deskripsi:** Menghapus atau menonaktifkan akun teknisi (otomatis soft-deactivate jika sudah punya riwayat servis).
- **Backend File:** [`apps/web/app/api/v1/admin/mechanics/[id]/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/admin/mechanics/[id]/route.ts)
- **Frontend Page (UI):** Tombol Hapus pada kartu mekanik di [`/admin/mechanics`](file:///c:/laragon/www/UKK/apps/web/app/(admin)/admin/mechanics/page.tsx).

---

## 7. Fitur Global Topbar & Command Palette
- **Notifikasi Live:** `GET /api/v1/notifications` ➔ Mengambil notifikasi lonceng & status unread count.
  - File Backend: [`apps/web/app/api/v1/notifications/route.ts`](file:///c:/laragon/www/UKK/apps/web/app/api/v1/notifications/route.ts)
  - UI Header: [`apps/web/components/admin/admin-shell.tsx`](file:///c:/laragon/www/UKK/apps/web/components/admin/admin-shell.tsx)
- **Command Palette Global (`Ctrl + K`):** Pencarian instan booking pengguna kapan saja.
  - UI Component: [`apps/web/components/admin/command-palette.tsx`](file:///c:/laragon/www/UKK/apps/web/components/admin/command-palette.tsx)
