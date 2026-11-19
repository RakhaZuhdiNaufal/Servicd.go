# Video tutorial

Taruh file video tutorial di folder ini. Nama file harus **persis** seperti daftar
di bawah, karena itu yang dipanggil `TUTORIALS` di `app/(customer)/tutorial/page.tsx`.

| Nama file                | Judul di halaman                       |
| ------------------------ | -------------------------------------- |
| `ganti-oli-mesin.mp4`    | Ganti Oli Mesin Sendiri                |
| `ganti-filter-udara.mp4` | Bersihkan & Ganti Filter Udara         |
| `cek-aki.mp4`            | Cek Kondisi Aki & Bersihkan Terminal   |
| `ganti-kampas-rem.mp4`   | Ganti Kampas Rem Depan                 |
| `isi-air-radiator.mp4`   | Isi Ulang Air Radiator                 |
| `ganti-filter-ac.mp4`    | Ganti Filter AC Kabin                  |

Catatan:

- Format **MP4 (H.264 + AAC)**. Ini yang didukung semua browser; `.mkv` dan `.avi` tidak.
- Usahakan di bawah ~20 MB per video, karena file di `public/` ikut terkirim apa adanya
  tanpa kompresi dan juga diunduh pengguna lewat tombol "Unduh".
- Mau menambah, mengganti judul, atau menghapus tutorial? Edit array `TUTORIALS`
  di `app/(customer)/tutorial/page.tsx`, lalu taruh filenya di sini.
- Selama filenya belum ada, kartunya tetap tampil tetapi pemutarnya kosong.
