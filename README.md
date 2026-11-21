# Si Paling Arsip

Website minimalis untuk menyimpan, mencari, membaca ulang, dan membagikan arsip berkas **PDF**, **PPT/PPTX**, **APK (Software EDC)**, dan **Teks/SOP**.

## Fitur
- **Unggah Berkas & Tulis SOP**: Mendukung PDF, PPT/PPTX, APK (maks. 200 MB), TXT, MD, CSV, atau tulis catatan SOP langsung.
- **Pencarian Cepat**: Cari berdasarkan judul, nama file, kategori, tag, catatan, maupun isi teks (shortcut `/`).
- **Baca Ulang di Browser**: Preview langsung untuk PDF dan Teks.
- **Link Share Read-Only untuk Teknisi (`/share/:id`)**:
  - Setiap berkas bisa langsung disalin link-nya atau dibagikan ke WhatsApp.
  - Teknisi yang membuka link `/share/:id` **hanya bisa melihat & mengunduh berkas tersebut** — tidak bisa melihat arsip lain, tidak bisa mengedit, menghapus, atau mengunggah berkas.
- **Kunci Dashboard Opsional (`ADMIN_PIN`)**:
  - Jika dijalankan online, atur environment variable `ADMIN_PIN` agar halaman utama (`/`) meminta PIN, sementara link `/share/:id` tetap terbuka untuk teknisi.

## Menjalankan Secara Lokal
```bash
npm install
npm start
```
Buka `http://localhost:3456`.

Jika ingin mengaktifkan PIN Admin saat lokal:
```powershell
$env:ADMIN_PIN="123456"; npm start
```

## Deploy Online via GitHub
> **Catatan:** GitHub Pages hanya mendukung website statis (HTML/CSS/JS), sedangkan Si Paling Arsip membutuhkan server Node.js untuk menyimpan file upload. Cara terbaik adalah **push ke GitHub**, lalu hubungkan repo tersebut ke layanan hosting Node.js seperti **Railway**, **Render**, atau **VPS**.

1. Buat repository baru di GitHub (misal `si-paling-arsip`).
2. Push project ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit Si Paling Arsip"
   git branch -M main
   git remote add origin https://github.com/USERNAME/si-paling-arsip.git
   git push -u origin main
   ```
3. Hubungkan repository ke **Railway** / **Render** / **VPS**:
   - Start command: `npm start`
   - Tambahkan Environment Variable: `ADMIN_PIN=kode_rahasia_anda`
   - Pastikan memasang **Persistent Volume** pada folder `/app/uploads` dan `/app/data` agar file PDF/APK tidak hilang saat server restart.
