# Checklist Penanganan Gangguan

Aplikasi checklist statis berbasis HTML, CSS, dan JavaScript untuk pencatatan penanganan gangguan operasional.

## Fitur Produksi Yang Sudah Ditambahkan

- Metadata SEO, Open Graph, favicon, dan web manifest.
- JavaScript dipisah ke `app.js` agar lebih mudah dipelihara.
- Validasi input tambahan:
  - `petugas`, `nipp`, `lokasi` wajib.
  - `nipp` angka 5-20 digit.
  - `keterangan` dibatasi 1000 karakter.
- Auto-save ke local storage saat pengguna mengetik.
- Integrasi backend untuk tombol `Kirim` melalui endpoint API yang dapat dikonfigurasi.
- Outbox offline: jika kirim gagal, data masuk antrean lokal dan akan disinkronkan otomatis saat online.
- Halaman `history.html` untuk melihat riwayat kiriman dari backend.
- Verifikasi QR ke server melalui endpoint verifikasi.
- Tanda tangan digital berbasis passphrase yang menghasilkan QR.
- Tombol `Selesai` hanya aktif setelah tanda tangan digital dibuat.
- PDF hasil ekspor menampilkan QR di kanan bawah beserta nama petugas dan NIPP.
- Fallback ekspor ke file `.txt` jika library PDF tidak tersedia.
- UX mode checklist kosong: tombol mode dinonaktifkan dan tabel menampilkan pesan.
- Telemetry ringan di local storage (`checklist-telemetry`) untuk error dan aksi penting.
- Halaman kustom `404.html`.
- Halaman login (`login.html`) dengan autentikasi NIPP + password sebelum mengakses halaman utama.
- Menu `Daftar` di halaman login untuk membuat akun baru (NIPP, password, dan PIN tanda tangan).
- File keamanan untuk hosting:
  - `_headers` untuk Netlify dan host kompatibel.
  - `web.config` untuk IIS.

## Struktur Utama

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `favicon.svg`
- `og-image.svg`
- `404.html`
- `_headers`
- `web.config`
- `config.js`
- `config.example.js`
- `history.html`
- `history.js`

## Catatan Sebelum Deploy

1. Ganti domain placeholder di `robots.txt` dan `sitemap.xml`.
2. Pastikan hosting menggunakan HTTPS agar header HSTS efektif.
3. Jika ingin andal tanpa CDN, sediakan file jsPDF lokal lalu ubah sumber script di `index.html`.
4. Isi `config.js` berdasarkan contoh `config.example.js`:
  - `apiEndpoint`: URL endpoint POST checklist.
  - `apiToken`: token bearer jika backend memerlukan autentikasi.
  - `verifyEndpoint`: URL endpoint verifikasi QR (opsional jika pola URL standar).
  - `authEndpoint`: URL endpoint autentikasi akun (`auth-user`) di Supabase.
  - `authUsers`: fallback akun lokal jika `authEndpoint` belum tersedia (isi `nipp`, `nama`, `jabatan`, `password`, `signaturePin`).

## Login Default

- NIPP: `123456`
- Password: `230605`
- PIN Tanda Tangan: `123456`

Silakan ganti di `config.js` sebelum dipakai untuk operasional.

## Uji Cepat Setelah Deploy

1. Buka halaman utama dan cek tidak ada error di console.
2. Isi form, centang checklist, refresh halaman, pastikan data tetap ada.
3. Buat tanda tangan digital dengan passphrase dan pastikan QR muncul.
4. Pastikan tombol `Selesai` aktif hanya setelah tanda tangan dibuat.
5. Tes tombol `Kirim`:
  - saat endpoint benar, data harus terkirim.
  - saat offline/endpoint down, data harus masuk antrean dan tersinkron saat online kembali.
6. Tes halaman `Riwayat` untuk memuat data dari server.
7. Tes verifikasi QR di halaman `Riwayat` dengan payload hasil scan.
8. Tes tombol `Selesai` saat online dan saat library PDF gagal dimuat (harus fallback ke `.txt`).

## Roadmap Lanjutan

Lihat rencana implementasi bertahap di `ROADMAP.md`.

## Setup Backend

Untuk mengaktifkan backend tombol `Kirim` (Supabase), ikuti panduan di `BACKEND_SETUP.md`.

Untuk setup cepat via terminal:

- `scripts/deploy-supabase.ps1` untuk link project, set secrets, dan deploy functions.
- `scripts/test-auth-user.ps1` untuk test register/login/verify-pin endpoint auth.
