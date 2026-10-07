# Roadmap Implementasi 3 Tahap

Dokumen ini memecah pengembangan aplikasi checklist menjadi 3 tahap agar transisi dari aplikasi statis ke aplikasi operasional bisa terkontrol.

## Tahap 1 - Fondasi Operasional (Prioritas Tinggi)

### Target
- Data checklist tersimpan terpusat (bukan hanya local storage).
- Tombol Kirim benar-benar mengirim data.
- Ada autentikasi user dasar.

### Deliverable
- Backend API untuk create dan read checklist.
- Database terpusat dengan tabel utama.
- Login dasar berbasis akun.
- Integrasi frontend ke endpoint Kirim.

### Ruang Lingkup Teknis
- Pilihan stack cepat:
  - Opsi A: Supabase (PostgreSQL + auth + row-level security).
  - Opsi B: Firebase (Firestore + auth).
- Struktur data awal:
  - users: id, nama, nipp, role, created_at.
  - checklists: id, gangguan_key, mode_checklist, petugas_id, lokasi, tanggal, keterangan, payload_json, created_at.
  - signatures: id, checklist_id, passphrase_hash, payload_hash, qr_payload, signed_at.
- Endpoint minimal:
  - POST /api/checklists
  - GET /api/checklists/:id
  - GET /api/checklists?date=...&lokasi=...

### Kriteria Selesai
- Kirim berhasil menyimpan data ke server.
- Data bisa dibuka kembali dari perangkat lain.
- Ada validasi server-side untuk NIPP, field wajib, dan payload.

### Estimasi
- 5-8 hari kerja.

## Tahap 2 - Kontrol & Verifikasi (Prioritas Menengah)

### Target
- Setiap perubahan terekam jelas (audit trail).
- QR bisa diverifikasi, bukan hanya ditampilkan.
- Ada dashboard monitoring dasar.

### Deliverable
- Audit log immutable.
- Halaman verifikasi QR.
- Dashboard ringkas operasional.

### Ruang Lingkup Teknis
- Audit trail:
  - checklist_events: id, checklist_id, actor_id, action, before_json, after_json, created_at.
- QR verification flow:
  - Scanner membaca QR payload.
  - Sistem cocokkan payload_hash dengan data checklist terbaru.
  - Status hasil: valid, invalid, mismatch.
- Dashboard:
  - Jumlah gangguan per hari.
  - Persentase checklist selesai.
  - Gangguan paling sering.
  - Rata-rata waktu penyelesaian (jika timestamp lengkap tersedia).

### Kriteria Selesai
- Riwayat perubahan bisa ditelusuri per checklist.
- QR verification memberikan hasil yang konsisten.
- Supervisor bisa melihat ringkasan operasional harian.

### Estimasi
- 7-10 hari kerja.

## Tahap 3 - Ketahanan Produksi (Prioritas Tinggi untuk Go-Live Besar)

### Target
- Keamanan dan reliabilitas setara aplikasi produksi.
- Pengembangan aman lewat CI/CD dan test otomatis.

### Deliverable
- Test otomatis unit + integration.
- Monitoring error dan alerting.
- Backup, restore, dan SOP rollback.
- Hardening API dan keamanan aplikasi.

### Ruang Lingkup Teknis
- Testing:
  - Unit test untuk validasi form, state, dan signature logic.
  - Integration test untuk endpoint Kirim dan verifikasi QR.
- Observability:
  - Error tracking (Sentry atau setara).
  - Logging terstruktur server.
- Security:
  - Rate limiting endpoint.
  - IP throttling untuk login.
  - JWT/session hardening.
- Delivery:
  - CI pipeline lint, test, build.
  - CD ke staging lalu production.

### Kriteria Selesai
- Rilis bisa dilakukan dengan risiko rendah.
- Jika gagal rilis, rollback jelas dan cepat.
- Error penting terdeteksi otomatis.

### Estimasi
- 8-12 hari kerja.

## Rencana Eksekusi Praktis

1. Mulai Tahap 1 dengan Supabase agar cepat (database + auth + API function).
2. Aktivasi endpoint Kirim dan simpan payload lengkap dari frontend.
3. Setelah data masuk stabil selama 1-2 minggu, lanjut Tahap 2 untuk audit dan verifikasi.
4. Tutup dengan Tahap 3 sebelum skala pemakaian diperbesar.

## Risiko Utama dan Mitigasi

- Risiko: Data dari local storage tidak sinkron dengan server.
  - Mitigasi: Tambah status sinkron dan retry queue saat offline.
- Risiko: QR dipahami sebagai tanda tangan legal penuh.
  - Mitigasi: Tambah disclaimer dan verifikasi hash server-side.
- Risiko: Data tidak konsisten antar user.
  - Mitigasi: Terapkan validasi server-side sebagai sumber kebenaran tunggal.
