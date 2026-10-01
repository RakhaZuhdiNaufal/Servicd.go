# 📋 ServiceGo — Development Plan & Roadmap

Dokumen ini mencatat rencana fitur, arsitektur teknis, dan rancangan implementasi yang telah disepakati. Format disusun per nomor rencana (Plan) agar rencana baru di masa depan dapat ditambahkan secara terstruktur.

---

## 📌 PLAN #1: Implementasi Foto Riil Kendaraan & Cascading Dropdown

### 1. Latar Belakang & Tujuan
* **Masalah Saat Ini**: Kartu kendaraan pada profil dan form booking masih menggunakan ikon vektor kartun generik, yang kurang memberikan kesan realistis dan premium.
* **Tujuan**: Mengganti ikon kartun dengan foto kendaraan asli bersudut studio 3/4 depan berlatar transparan (seperti contoh foto Avanza / Brio), terintegrasi secara otomatis saat user mendaftarkan kendaraan mereka.
* **Keputusan Teknis Penting**:
  * **TIDAK menggunakan free-text string detection** karena rentan typo, variasi ketikan user, dan inkonsistensi data.
  * **MENGGUNAKAN Cascading Searchable Dropdown / Combobox** (Pilih Merk ➔ Pilih Model) untuk menjamin akurasi pemanggilan foto 100%.

---

### 2. Struktur Data & Standar Penamaan Aset
1. **Daftar Model Populer Tahap 1 (Top 20–25 Kendaraan Indonesia)**:
   * **Toyota**: Avanza, Veloz, Innova (Reborn/Zenix), Calya, Rush, Fortuner, Agya, Raize, Yaris.
   * **Honda**: Brio (Satya/RS), HR-V, CR-V, City Hatchback, BR-V, Jazz.
   * **Mitsubishi**: Xpander, Xpander Cross, Pajero Sport.
   * **Daihatsu**: Sigra, Xenia, Terios, Ayla, Rocky.
   * **Suzuki**: Ertiga, XL7.

2. **Aturan Penamaan File (Slug File Naming)**:
   * Menggunakan format huruf kecil dipisah tanda hubung: `[brand]-[model].webp`
   * Contoh:
     * `toyota-avanza.webp`
     * `honda-brio.webp`
     * `mitsubishi-xpander.webp`
     * `yamaha-nmax.webp`
     * `honda-beat.webp`

---

### 3. Penyimpanan & Optimasi Gambar
1. **Lokasi Penyimpanan**:
   * **Supabase Storage Bucket**: `vehicle-models` (Public Bucket).
   * URL format: `https://[supabase-project-id].supabase.co/storage/v1/object/public/vehicle-models/[slug].webp`
2. **Kriteria Aset Gambar**:
   * **Background**: Wajib di-*remove background* (hanya menyisakan bodi kendaraan dan bayangan halus/shadow di bawah ban).
   * **Format File**: WebP (Lossless/High Quality).
   * **Ukuran Dimensi**: Sekitar `400 x 260 px`.
   * **Ukuran File**: Target 15 KB – 30 KB per gambar (total 25 mobil < 700 KB, sangat ringan dan cepat di-load via CDN).
   * **Sudut Pandang (Angle)**: Seragam 3/4 depan menghadap serong kiri (standar brosur resmi APM).

---

### 4. Penyesuaian Desain UI & Kartu Kendaraan (FE)
1. **Proporsi Kotak Gambar (Thumbnail Container)**:
   * Mengubah wadah ikon dari kotak bujur sangkar `1:1` (`h-14 w-14`) menjadi **rounded rectangle landscape** (`w-20 h-14 sm:w-24 sm:h-16`).
   * Sesuai rasio bodi mobil (sekitar 16:10 / 4:3) agar bodi kendaraan tidak tampak mengecil atau terpotong.
2. **Styling Wadah**:
   * Background: `bg-slate-50 dark:bg-slate-800/80` dengan border halus `border-slate-200/90 dark:border-slate-700/80 rounded-xl`.
   * Elemen Gambar: `<img className="w-full h-full object-contain p-1" />` agar pas dan memiliki *breathing room*.
3. **Kompatibilitas Dark/Light Mode**:
   * Karena background foto transparan, gambar mobil akan membaur sempurna baik di tema terang maupun gelap.

---

### 5. Alur Pemilihan Kendaraan (UX / Form Flow)
1. **Dropdown Berjenjang (Cascading Select)**:
   * **Field 1 (Tipe)**: Mobil / Motor.
   * **Field 2 (Merk)**: Toyota, Honda, Daihatsu, Mitsubishi, Suzuki, Yamaha, dll.
   * **Field 3 (Model)**: Otomatis memfilter daftar model sesuai merk yang dipilih.
2. **Opsi "Lainnya / Input Manual"**:
   * Jika model kendaraan user tidak ada di daftar katalog (misal: mobil klasik atau modifikasi khusus), disediakan opsi *"Model Lainnya (Ketik Manual)"*.
   * User tetap bisa mengetikkan nama modelnya sendiri tanpa terblokir.

---

### 6. Mekanisme Fallback Pintar (Smart Fallback)
1. Jika kendaraan memilih opsi *"Model Lainnya"* atau URL gambar gagal dimuat (`onError`):
   * Sistem **TIDAK** menampilkan gambar rusak atau ikon kartun anak-anak.
   * Sistem menampilkan **siluet vektor monokrom elegan** sesuai kategori bodi:
     * Siluet Sedan / Hatchback
     * Siluet SUV / Crossover
     * Siluet MPV / Minivan
     * Siluet Motor Matic / Sport

---

### 7. Checklist Tahapan Pengerjaan (Action Steps)
- [ ] **Step 1**: Menyiapkan dan menghapus background 15–20 foto model terlaris, lalu simpan dalam format `.webp`.
- [ ] **Step 2**: Membuat bucket publik `vehicle-models` di Supabase Storage dan upload aset foto.
- [ ] **Step 3**: Membuat file master data / konstanta `VEHICLE_CATALOG` di project web (berisi relasi brand, model, kategori, dan path gambar).
- [ ] **Step 4**: Memperbarui modal *"Tambah Kendaraan"* dan *"Edit Kendaraan"* agar menggunakan cascading select brand & model.
- [ ] **Step 5**: Memperbarui komponen kartu kendaraan di halaman Profile dan Booking agar wadah gambarnya berformat rounded landscape sesuai desain referensi.

---

## 📌 PLAN #2: Integrasi Live CS Realtime ke Dashboard Admin

### 1. Latar Belakang & Tujuan
* **Status Saat Ini**: Drawer CS di sisi customer (Tahap 1: UI Slide-over, FAQ Bot Simulator, Auto-responder) telah selesai dikerjakan.
* **Tujuan Tahap 2**: Menghubungkan chat drawer customer secara realtime dengan tim Admin/Customer Service ServiceGo, sehingga admin dapat memantau percakapan yang masuk dan membalas langsung dari dashboard admin.

---

### 2. Arsitektur Database (Supabase)
1. **Tabel `support_conversations`**:
   * `id`: UUID (Primary Key, default `gen_random_uuid()`)
   * `customer_id`: UUID (Foreign Key ke `auth.users`, nullable untuk tamu/guest)
   * `customer_name`: VARCHAR / TEXT
   * `customer_email`: VARCHAR / TEXT
   * `status`: 'active' | 'resolved' | 'closed' (default 'active')
   * `last_message`: TEXT
   * `last_message_at`: TIMESTAMPTZ (default `now()`)
   * `unread_admin_count`: INT (default 0)
   * `created_at`: TIMESTAMPTZ (default `now()`)
2. **Tabel `support_messages`**:
   * `id`: UUID (Primary Key, default `gen_random_uuid()`)
   * `conversation_id`: UUID (Foreign Key ke `support_conversations.id` on delete cascade)
   * `sender_type`: 'customer' | 'admin' | 'bot'
   * `sender_id`: UUID (nullable jika bot)
   * `message`: TEXT
   * `is_read`: BOOLEAN (default false)
   * `created_at`: TIMESTAMPTZ (default `now()`)

---

### 3. Arsitektur Realtime (Supabase Realtime Channel)
* **Zero External Library**: Tidak menggunakan Socket.io / server Express terpisah.
* Memanfaatkan fitur bawaan `@supabase/supabase-js`:
  ```ts
  supabase
    .channel('support-room:' + conversationId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'support_messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      // Menambahkan pesan baru ke chat feed customer/admin secara realtime
    })
    .subscribe();
  ```

---

### 4. Implementasi UI Dashboard Admin (`/admin/support`)
1. **Daftar Percakapan Masuk (Inbox Sidebar)**:
   * Menampilkan daftar chat dari customer yang sedang aktif / menunggu balasan.
   * Indikator badge unread count, nama customer, email, dan waktu pesan terakhir.
   * Filter status: Semua, Belum Dibalas, Selesai.
2. **Ruang Chat Admin (Chat Room View)**:
   * Menampilkan riwayat chat lengkap antara customer, bot, dan admin.
   * Input teks balasan admin dengan shortcut template balasan cepat (Quick Canned Responses).
   * Tombol "Tandai Selesai" untuk menutup tiket percakapan.

---

### 5. Checklist Tahapan Pengerjaan
- [ ] **Step 1**: Menambahkan DDL tabel `support_conversations` & `support_messages` di `supabase_schema.sql` serta mengaktifkan Supabase Realtime replication pada tabel tersebut.
- [ ] **Step 2**: Menghubungkan pengiriman pesan custom di `support-chat-drawer.tsx` ke Supabase insert & subscribe realtime channel.
- [ ] **Step 3**: Membuat halaman panel live chat di Admin (`apps/web/app/(admin)/admin/support/page.tsx`).
- [ ] **Step 4**: Menambahkan menu "Live Support" pada sidebar Admin navigation (`admin-shell.tsx`).
- [ ] **Step 5**: Pengujian dua arah: Customer mengirim pertanyaan ➔ Notifikasi chat muncul di Admin ➔ Admin membalas ➔ Balasan langsung tampil realtime di drawer Customer.

---

## 📌 PLAN #3: Smart Service Estimator & Vehicle Diagnostic (Kalkulator & Diagnosa Kebutuhan Servis Pintar)

### 1. Latar Belakang & Masalah Pengguna
* **Masalah Pengguna**: Mayoritas pemilik kendaraan awam sering tidak memahami jenis servis atau komponen apa saja yang sudah waktunya diganti/diperiksa. Hal ini memicu keraguan saat ingin melakukan booking ke bengkel karena takut dikenakan biaya tak terduga (*overcharging*).
* **Solusi**: Fitur interaktif yang menganalisis kebutuhan servis kendaraan secara transparan berdasarkan input pemakaian riil: Odometer (KM), Interval Waktu Terakhir Servis, serta Kuesioner Gejala Fisik kendaraan.
* **Nilai Bisnis**: Menjadi mesin konversi (*conversion engine*) utama yang mengubah pengunjung awam yang sedang bingung menjadi transaksi booking bengkel langsung dalam 1 klik.

---

### 2. Konsep UI/UX: "Hero Select" Split View (Visual Interaktif)
Halaman dibagi menjadi 2 kolom (*Desktop Split Layout*) yang modern dan dinamis:

#### Kolom Kiri: "Hero Select" Vehicle Showcase (Ala Pemilihan Karakter Game)
1. **Showcase Mobil Realistis**:
   * Menampilkan foto studio mobil asli berlatar transparan (Toyota Avanza, Honda Brio, Mitsubishi Xpander, Toyota Innova Zenix, Honda HR-V, dll.).
   * Mobil berpijak di atas panggung/podium digital dengan efek pencahayaan halus (*spotlight glow*).
2. **Carousel Interaktif**:
   * Dapat digeser dengan navigasi tombol panah kiri-kanan (`←` `→`), sentuhan *swipe* pada mobile/tablet, atau memilih thumbnail di bagian bawah.
   * Transisi perpindahan mobil beranimasi halus (*smooth slide & scale effect*).
3. **Kartu Spesifikasi Cepat**:
   * Menampilkan: Nama Model Kendaraan, Tipe Bodi (*MPV, SUV, City Car, Hatchback*), Kapasitas Mesin (*1.200cc, 1.500cc, 2.000cc*), dan Generasi Tahun.

#### Kolom Kanan: Interactive Diagnostic Form
1. **Input Jarak Tempuh (Odometer)**:
   * Kolom input angka KM responsif yang disinkronkan dengan visual slider interaktif (rentang 5.000 KM hingga 150.000+ KM).
2. **Interval Servis Terakhir**:
   * Pilihan tombol kapsul cepat (*quick pills*):
     * `< 3 Bulan yang lalu`
     * `6 Bulan yang lalu`
     * `1 Tahun yang lalu`
     * `> 1 Tahun / Lupa`
     * `Belum Pernah Servis`
3. **Kuesioner Gejala Fisik Mobil (Opsional / Diagnostic Check)**:
   * Pilihan chip toggle simpel (*"Ya / Tidak"*) untuk mendeteksi tanda-tanda keausan suku cadang:
     * 🛑 **Sistem Pengereman**: *"Apakah rem berdecit, bergetar saat diinjak, atau pengereman terasa kurang pakem?"*
     * ❄️ **Sistem AC & Kabin**: *"Apakah hembusan AC kurang dingin atau mengeluarkan aroma apek saat dinyalakan?"*
     * ⚡ **Performa Mesin**: *"Apakah tarikan mesin terasa berat, ndut-ndutan (brebet), atau konsumsi BBM lebih boros?"*
     * 🚗 **Kaki-kaki & Kemudi**: *"Apakah setir bergetar pada kecepatan tertentu atau mobil cenderung lari ke satu sisi?"*
     * 🔋 **Kelistrikan & Aki**: *"Apakah starter mobil terasa berat di pagi hari atau lampu utama meredup?"*
     * 💧 **Kebocoran Cairan**: *"Apakah ada rembesan atau tetesan oli/cairan di lantai garasi saat mobil diparkir?"*

---

### 3. Logika & Algoritma Diagnosa Pintar (Diagnostic Engine)
Sistem menggunakan *deterministic rule-based evaluation* yang selaras dengan panduan servis berkala resmi bengkel:

1. **Evaluasi Berdasarkan Siklus Odometer & Waktu**:
   * **Kelipatan 10.000 KM / 6 Bulan**:
     * Paket: *Servis Berkala Ringan (Minor Service)*.
     * Item: Ganti Oli Mesin Sintetik, Filter Oli Baru, Pengecekan 20 Titik (Cairan, Aki, Lampu, Tekanan Ban).
   * **Kelipatan 20.000 KM / 12 Bulan**:
     * Paket: *Servis Berkala Menengah (Medium Service)*.
     * Item: Tune Up Mesin, Pembersihan & Penyetelan Kampas Rem 4 Roda, Rotasi Ban, Ganti Filter Udara (jika kotor).
   * **Kelipatan 40.000 KM / 24 Bulan (Major Service)**:
     * Paket: *Servis Berkala Besar*.
     * Item: Penggantian Minyak Rem (Brake Fluid), Radiator Coolant, Filter Bahan Bakar, Busi Mesin, Pengurasan Oli Transmisi / Gardan.

2. **Evaluasi Berdasarkan Gejala Khusus (Symptom Overrides)**:
   * Gejala Rem = "Ya" ➔ Menambahkan rekomendasi: *Cek & Ganti Kampas Rem Depan/Belakang (Brake Pad / Brake Shoe)*.
   * Gejala AC = "Ya" ➔ Menambahkan rekomendasi: *Flushing Freon AC & Penggantian Filter Kabin (Cabin Filter)*.
   * Gejala Performa = "Ya" ➔ Menambahkan rekomendasi: *Carbon Cleaner / Gurah Mesin & Pembersihan Throttle Body*.
   * Gejala Kaki-kaki = "Ya" ➔ Menambahkan rekomendasi: *Spooring 3D & Balancing 4 Roda*.
   * Gejala Kelistrikan = "Ya" ➔ Menambahkan rekomendasi: *Uji Diagnostik Tegangan Aki & Alternator*.

---

### 4. Output Hasil & Golden Flow (Konversi Langsung ke Booking)
Setelah user menekan tombol **"Analisis Kebutuhan Mobil Saya"**:

1. **Kartu Skor Kesehatan Kendaraan (*Health Score Card*)**:
   * Indikator status visual:
     * 🟢 **Kondisi Baik**: Hanya butuh perawatan berkala standar.
     * 🟡 **Perlu Perhatian**: Sudah memasuki masa penggantian komponen aus.
     * 🔴 **Perlu Penanganan Segera**: Terdapat gejala kritis (rem aus, kebocoran) yang berisiko jika diabaikan.
2. **Rincian Paket & Estimasi Transparan**:
   * Rincian daftar pekerjaan dan suku cadang yang disarankan.
   * Alasan logis rekomendasi (misal: *"Odometer 42.000 KM telah melampaui batas aman kuras minyak rem, dan rem berdecit mengindikasikan ketebalan kampas rem di bawah 2mm"*).
   * Estimasi total biaya dan estimasi waktu pengerjaan (misal: ~60 menit).
3. **Integrasi Transaksi 1-Klik**:
   * Tombol CTA: **"Booking Paket Servis Ini Sekarang"**.
   * User langsung diarahkan ke halaman `/booking/new` dengan parameter query / state terisi otomatis:
     * Kendaraan yang dipilih otomatis terpilih di formulir.
     * Item-item servis yang direkomendasikan langsung tercentang otomatis di daftar layanan.
     * User tinggal memilih cabang bengkel terdekat, tanggal, dan jam kunjungan.

---

### 5. Rencana Rute & Aksesibilitas
* **URL Halaman**: `/diagnostic` atau `/calculator` (bersahabat untuk tamu publik maupun user yang sudah login).
* **Entri Menu**:
  * Tautan di Header Navigasi Pelanggan: *"Cek Servis"* atau *"Diagnosa"*.
  * Banner CTA khusus di halaman Beranda: *"Bingung mobil Anda butuh servis apa? Cek kesehatan mobil Anda di sini →"*.

---

### 6. Checklist Tahapan Pengerjaan (Action Steps)
- [ ] **Step 1**: Menyiapkan katalog model mobil populer berformat foto transparan (Toyota Avanza, Honda Brio, Mitsubishi Xpander, Toyota Innova, dll.) beserta data spesifikasi standarnya.
- [ ] **Step 2**: Membuat modul kalkulator logika diagnosa (`lib/service-diagnostic-engine.ts`) berbasis aturan interval KM, durasi bulan, dan symptom matching.
- [ ] **Step 3**: Membangun halaman `/diagnostic` dengan layout split screen (kiri: Carousel "Hero Select" mobil, kanan: Form input Odometer & kuesioner gejala).
- [ ] **Step 4**: Membangun komponen kartu hasil analisis rekomendasi (*Health Score*, daftar part/jasa, estimasi biaya & durasi).
- [ ] **Step 5**: Mengintegrasikan tombol CTA hasil diagnosa agar me-redirect ke `/booking/new` dengan pre-filled data kendaraan & paket servis terpilih.
- [ ] **Step 6**: Menambahkan menu akses *"Diagnosa Servis"* di header navigasi customer shell dan banner interaktif di beranda.

---

## 📌 PLAN #4: (Rencana Fitur Berikutnya)
*Disediakan untuk rencana fitur atau revisi selanjutnya.*

