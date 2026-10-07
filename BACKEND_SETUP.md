# Setup Backend Supabase (Tahap 1)

Dokumen ini menghubungkan tombol Kirim pada frontend ke endpoint Supabase Edge Function.

## 1) Buat project Supabase

1. Buat project baru di dashboard Supabase.
2. Catat URL project dan anon key.

## 2) Jalankan schema SQL

1. Buka SQL Editor.
2. Jalankan file [supabase/schema.sql](supabase/schema.sql).

## 3) Deploy Edge Functions

1. Install Supabase CLI.
2. Login:
   - `supabase login`
3. Link ke project:
   - `supabase link --project-ref <PROJECT_REF>`
4. Deploy function kirim/riwayat:
   - `supabase functions deploy submit-checklist --no-verify-jwt`
5. Deploy function verifikasi QR:
  - `supabase functions deploy verify-checklist --no-verify-jwt`
6. Deploy function autentikasi akun:
  - `supabase functions deploy auth-user --no-verify-jwt`

## 4) Set environment variable function

Set variabel berikut di Supabase Function secrets:

1. `CHECKLIST_API_TOKEN` = token rahasia bebas (panjang, random).
2. `PROJECT_URL` = URL project Supabase (catatan: tidak bisa pakai prefix `SUPABASE_`).
3. `SERVICE_ROLE_KEY` = service role key project Supabase (catatan: tidak bisa pakai prefix `SUPABASE_`).

Contoh command:

- `supabase secrets set CHECKLIST_API_TOKEN="<TOKEN_KAMU>"`
- `supabase secrets set PROJECT_URL="https://xxxx.supabase.co"`
- `supabase secrets set SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>"`

## 5) Isi config frontend

Edit [config.js](config.js):

```javascript
window.APP_CONFIG = {
  apiEndpoint: "https://<PROJECT_REF>.functions.supabase.co/submit-checklist",
  apiToken: "<TOKEN_KAMU>",
  verifyEndpoint: "https://<PROJECT_REF>.functions.supabase.co/verify-checklist",
  authEndpoint: "https://<PROJECT_REF>.functions.supabase.co/auth-user"
};
```

Catatan:

1. Endpoint `submit-checklist` sekarang juga mendukung `GET` untuk halaman riwayat (`history.html`).
2. Jika `verifyEndpoint` dikosongkan, frontend akan otomatis menurunkannya dari `apiEndpoint`.
3. Jika `authEndpoint` dikosongkan, frontend akan otomatis mencoba menurunkannya dari `apiEndpoint` (mengganti `submit-checklist` menjadi `auth-user`).

## 6) Uji endpoint

Uji cepat dengan curl:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/submit-checklist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_KAMU>" \
  -d '{
    "requestId":"req-test-001",
    "clientSentAt":"2026-03-26T10:00:00.000Z",
    "progress":75,
    "signature":{"generatedAt":"2026-03-26T10:00:00.000Z"},
    "data":{
      "meta":{
        "gangguanKey":"sinyal",
        "modeChecklist":"mekanik",
        "petugas":"Budi",
        "nipp":"123456",
        "lokasi":"Tebing Tinggi"
      },
      "checklist":[{"kegiatan":"Lapor PPKP","selesai":true}]
    }
  }'
```

Jika respons `{"ok":true}`, integrasi siap dipakai di frontend.

## 7) Uji endpoint riwayat (GET)

```bash
curl -X GET "https://<PROJECT_REF>.functions.supabase.co/submit-checklist?limit=20&nipp=123456" \
  -H "Authorization: Bearer <TOKEN_KAMU>"
```

Uji detail per request id:

```bash
curl -X GET "https://<PROJECT_REF>.functions.supabase.co/submit-checklist?requestId=req-test-001" \
  -H "Authorization: Bearer <TOKEN_KAMU>"
```

## 8) Uji endpoint verifikasi QR

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/verify-checklist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_KAMU>" \
  -d '{
    "qrPayload":"{\"v\":1,\"n\":\"123456\",\"f\":\"<PAYLOAD_HASH_FULL>\"}"
  }'
```

## 9) Uji endpoint autentikasi akun

Daftar akun:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/auth-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_KAMU>" \
  -d '{
    "action":"register",
    "nipp":"123456",
    "nama":"Budi Santoso",
    "jabatan":"PPKA",
    "password":"rahasia123",
    "signaturePin":"123456"
  }'
```

## 10) Opsi cepat via script PowerShell

Jika ingin proses otomatis, jalankan script berikut dari root project:

```powershell
./scripts/deploy-supabase.ps1 `
  -ProjectRef "<PROJECT_REF>" `
  -SupabaseUrl "https://<PROJECT_REF>.supabase.co" `
  -ServiceRoleKey "<SERVICE_ROLE_KEY>" `
  -ChecklistApiToken "<TOKEN_KAMU>"
```

Lalu test endpoint auth-user:

```powershell
./scripts/test-auth-user.ps1 `
  -ProjectRef "<PROJECT_REF>" `
  -ApiToken "<TOKEN_KAMU>" `
  -Nipp "123456" `
  -Nama "Budi Santoso" `
  -Jabatan "PPKA" `
  -Password "rahasia123" `
  -SignaturePin "123456"
```

Login akun:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/auth-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_KAMU>" \
  -d '{
    "action":"login",
    "nipp":"123456",
    "password":"rahasia123"
  }'
```

Verifikasi PIN tanda tangan:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/auth-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_KAMU>" \
  -d '{
    "action":"verify-pin",
    "nipp":"123456",
    "signaturePin":"123456"
  }'
```

Cari data akun untuk lupa password:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/auth-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_KAMU>" \
  -d '{
    "action":"lookup-user",
    "nipp":"123456"
  }'
```

Reset password dari hasil pencarian NIPP:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/auth-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_KAMU>" \
  -d '{
    "action":"reset-password",
    "nipp":"123456",
    "password":"passwordbaru123"
  }'
```

## Catatan keamanan

1. Jangan commit token produksi ke repository publik.
2. Untuk fase berikutnya, ganti token statis dengan autentikasi user per akun.
3. Batasi origin request bila domain produksi sudah final.
