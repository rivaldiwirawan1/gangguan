-- Fix missing columns on checklist_users
ALTER TABLE public.checklist_users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.checklist_users ADD COLUMN IF NOT EXISTS is_super boolean DEFAULT false;
ALTER TABLE public.checklist_users ADD COLUMN IF NOT EXISTS nama text;
ALTER TABLE public.checklist_users ADD COLUMN IF NOT EXISTS jabatan text;

-- Update empty nama/jabatan
UPDATE public.checklist_users
SET nama = COALESCE(NULLIF(TRIM(nama), ''), 'Petugas ' || nipp)
WHERE nama IS NULL OR TRIM(nama) = '';

UPDATE public.checklist_users
SET jabatan = COALESCE(NULLIF(TRIM(jabatan), ''), 'Petugas')
WHERE jabatan IS NULL OR TRIM(jabatan) = '';

