-- CREATE ADMIN ACCOUNT for checklist_users
-- Replace the NIPP, password and PIN values before running.

-- Option A: Promote existing user to superuser
-- UPDATE public.checklist_users
-- SET is_super = true
-- WHERE nipp = '123456';

-- Option B: Insert a new superuser (replace values below)
INSERT INTO public.checklist_users (nipp, nama, jabatan, password_hash, signature_pin_hash, is_active, is_super)
VALUES (
  '00000', -- <REPLACE_WITH_ADMIN_NIPP>
  'Admin', -- <REPLACE_WITH_ADMIN_NAME>
  'Administrator', -- <REPLACE_WITH_ADMIN_ROLE>
  encode(digest('admin123','sha256'),'hex'), -- <REPLACE_WITH_ADMIN_PASSWORD_PLAIN>
  encode(digest('000000','sha256'),'hex'), -- <REPLACE_WITH_SIGNATURE_PIN_PLAIN>
  true,
  true
);

-- Safe-guard: ensure `is_super` column exists before inserting (Postgres supports IF NOT EXISTS)
ALTER TABLE public.checklist_users
  ADD COLUMN IF NOT EXISTS is_super boolean DEFAULT false;

-- If you already executed the INSERT and got error, run only the ALTER TABLE above first,
-- then run the INSERT (remove or change sample NIPP/password before executing).

-- Notes:
-- 1) Use Supabase SQL Editor (or psql) to run this file.
-- 2) Replace the sample plain-text password and PIN with your chosen values
--    before executing. The SQL stores SHA-256 hex digests (as other code expects).
-- 3) After creating/promoting the admin, login using the NIPP and password.
-- 4) For production, prefer creating the admin through a secure server-side flow.
