-- Supabase schema for checklist submission
-- Run this SQL in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.checklist_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  client_sent_at timestamptz not null,
  progress smallint not null check (progress >= 0 and progress <= 100),
  gangguan_key text not null,
  mode_checklist text not null,
  petugas text not null,
  nipp text not null,
  lokasi text not null,
  tanggal text,
  keterangan text,
  passphrase_hash text,
  payload_hash text,
  signature jsonb not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.checklist_submissions
  add column if not exists passphrase_hash text;

alter table public.checklist_submissions
  add column if not exists payload_hash text;

create index if not exists idx_checklist_submissions_created_at
  on public.checklist_submissions (created_at desc);

create index if not exists idx_checklist_submissions_gangguan
  on public.checklist_submissions (gangguan_key);

create index if not exists idx_checklist_submissions_nipp
  on public.checklist_submissions (nipp);

create index if not exists idx_checklist_submissions_payload_hash
  on public.checklist_submissions (payload_hash);

create table if not exists public.checklist_users (
  id uuid primary key default gen_random_uuid(),
  nipp text not null unique,
  nama text not null,
  jabatan text not null,
  password_hash text not null,
  signature_pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checklist_users
  add column if not exists nama text;

alter table public.checklist_users
  add column if not exists jabatan text;
 
alter table public.checklist_users
  add column if not exists avatar_url text;

alter table public.checklist_users
  add column if not exists is_super boolean default false;

update public.checklist_users
set nama = coalesce(nullif(trim(nama), ''), 'Petugas ' || nipp)
where nama is null or trim(nama) = '';

update public.checklist_users
set jabatan = coalesce(nullif(trim(jabatan), ''), 'Petugas')
where jabatan is null or trim(jabatan) = '';

alter table public.checklist_users
  alter column nama set not null;

alter table public.checklist_users
  alter column jabatan set not null;

create index if not exists idx_checklist_users_nipp
  on public.checklist_users (nipp);

create index if not exists idx_checklist_users_active
  on public.checklist_users (is_active);
