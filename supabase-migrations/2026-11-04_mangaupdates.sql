-- =====================================================================
-- REXXA AI · Migration: MangaUpdates sebagai sumber kedua
-- File baru: supabase-migrations/2026-11-04_mangaupdates.sql
-- Aman dijalankan berulang (idempotent). Tidak menghapus / mengubah data lama.
-- Prasyarat: supabase-manga.sql sudah pernah dijalankan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) rexxa_manga_follows: simpan ID kedua sumber + status pemetaan
-- ---------------------------------------------------------------------
alter table public.rexxa_manga_follows
  add column if not exists source            text  not null default 'mangadex',  -- sumber utama kartu: mangadex | mangaupdates
  add column if not exists mangadex_id       text,                               -- UUID MangaDex (null untuk manga khusus MangaUpdates)
  add column if not exists mu_id             text,                               -- series_id MangaUpdates (disimpan sebagai teks)
  add column if not exists mu_match          text,                               -- status pemetaan: auto | confirmed | pending | rejected
  add column if not exists mu_candidates     jsonb,                              -- kandidat pencocokan judul, menunggu konfirmasi user
  add column if not exists last_seen_chapter jsonb not null default '{}'::jsonb; -- chapter tertinggi yang sudah dinotifikasi per bahasa, mis. {"id":117,"en":117.5}

-- Isi mangadex_id untuk baris lama (semua follow lama berasal dari MangaDex)
update public.rexxa_manga_follows
   set mangadex_id = manga_id
 where mangadex_id is null
   and manga_id !~ '^mu:';

-- Isi last_seen_chapter dari last_chapter yang sudah ada (hanya nomor chapter yang valid)
update public.rexxa_manga_follows
   set last_seen_chapter = jsonb_build_object(last_chapter->>'lang', (last_chapter->>'chapter')::numeric)
 where last_seen_chapter = '{}'::jsonb
   and last_chapter->>'lang' in ('id', 'en')
   and last_chapter->>'chapter' ~ '^[0-9]+(\.[0-9]+)?$';

-- Agar Edge Function versi lama (yang belum tahu kolom baru) tetap jalan:
-- follow baru dari MangaDex otomatis mendapat mangadex_id = manga_id
create or replace function public.rexxa_follows_fill_ids() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.mangadex_id is null and coalesce(new.source, 'mangadex') = 'mangadex' and new.manga_id !~ '^mu:' then
    new.mangadex_id := new.manga_id;
  end if;
  return new;
end $$;
drop trigger if exists rexxa_follows_fill_ids on public.rexxa_manga_follows;
create trigger rexxa_follows_fill_ids before insert or update on public.rexxa_manga_follows
  for each row execute function public.rexxa_follows_fill_ids();

-- Batasan (ditambahkan hanya jika belum ada)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rexxa_mf_source_chk') then
    alter table public.rexxa_manga_follows
      add constraint rexxa_mf_source_chk check (source in ('mangadex', 'mangaupdates'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rexxa_mf_mu_match_chk') then
    alter table public.rexxa_manga_follows
      add constraint rexxa_mf_mu_match_chk check (mu_match is null or mu_match in ('auto', 'confirmed', 'pending', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rexxa_mf_has_id_chk') then
    alter table public.rexxa_manga_follows
      add constraint rexxa_mf_has_id_chk check (mangadex_id is not null or mu_id is not null);
  end if;
end $$;

-- Satu seri MangaUpdates hanya boleh diikuti sekali per user
-- (mencegah ganda: sekali lewat MangaDex yang dipetakan, sekali sebagai manga khusus MU)
create unique index if not exists rexxa_mf_user_mu_uniq
  on public.rexxa_manga_follows (user_id, mu_id) where mu_id is not null;

-- ---------------------------------------------------------------------
-- 2) rexxa_manga_updates: sumber, bahasa, dan kunci chapter untuk deduplikasi
-- ---------------------------------------------------------------------
alter table public.rexxa_manga_updates
  add column if not exists source      text not null default 'mangadex',  -- mangadex | mangaupdates
  add column if not exists lang        text,                              -- id | en
  add column if not exists chapter_key text;                              -- nomor chapter ternormalisasi, mis. "114.5" atau "extra:6"

update public.rexxa_manga_updates
   set lang = data->>'lang'
 where lang is null and data->>'lang' in ('id', 'en');

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rexxa_mu_source_chk') then
    alter table public.rexxa_manga_updates
      add constraint rexxa_mu_source_chk check (source in ('mangadex', 'mangaupdates'));
  end if;
end $$;

-- Deduplikasi di level database: satu chapter per manga per bahasa per user,
-- walau dilaporkan dua sumber atau beberapa grup. Baris lama (chapter_key null) tidak terpengaruh.
create unique index if not exists rexxa_mu_dedupe_uniq
  on public.rexxa_manga_updates (user_id, manga_id, lang, chapter_key)
  where chapter_key is not null;

-- ---------------------------------------------------------------------
-- 3) rexxa_manga_cache: cache respons API (dipakai server, tidak dibaca langsung oleh browser)
-- ---------------------------------------------------------------------
create table if not exists public.rexxa_manga_cache (
  sumber     text        not null check (sumber in ('mangadex', 'mangaupdates')),
  jenis      text        not null default 'series' check (jenis in ('series', 'search', 'releases')),
  series_id  text        not null,   -- ID seri; untuk jenis 'search' berisi kunci pencarian ternormalisasi
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (sumber, jenis, series_id)
);
create index if not exists rexxa_manga_cache_time on public.rexxa_manga_cache (updated_at);

alter table public.rexxa_manga_cache enable row level security;
-- Tanpa policy = anon/authenticated tidak bisa membaca/menulis; hanya Edge Function (service_role)
revoke all on public.rexxa_manga_cache from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) Izin untuk Edge Function & muat ulang cache skema API
-- ---------------------------------------------------------------------
grant all on public.rexxa_manga_cache, public.rexxa_manga_follows, public.rexxa_manga_updates to service_role;
notify pgrst, 'reload schema';
