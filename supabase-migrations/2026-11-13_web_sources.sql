-- =====================================================================
-- REXXA AI · Migration tahap 5: bookmark & notifikasi Shinigami, Komiku, Kiryuu
-- File baru: supabase-migrations/2026-11-13_web_sources.sql
-- Aman dijalankan berulang. Jalankan SETELAH 2026-11-04b_mangaupdates_dedupe.sql.
-- Untuk Edge Function rexxa-manga v1.8.0.
-- =====================================================================

-- 1) Sumber yang boleh dipakai di daftar diikuti & riwayat update
alter table public.rexxa_manga_follows drop constraint if exists rexxa_mf_source_chk;
alter table public.rexxa_manga_follows
  add constraint rexxa_mf_source_chk check (source in ('mangadex', 'mangaupdates', 'shinigami', 'komiku', 'kiryuu'));

alter table public.rexxa_manga_updates drop constraint if exists rexxa_mu_source_chk;
alter table public.rexxa_manga_updates
  add constraint rexxa_mu_source_chk check (source in ('mangadex', 'mangaupdates', 'shinigami', 'komiku', 'kiryuu'));

-- 2) Manga dari situs web tidak punya ID MangaDex / MangaUpdates; ID-nya ada di manga_id ("<sumber>:<id>")
alter table public.rexxa_manga_follows drop constraint if exists rexxa_mf_has_id_chk;
alter table public.rexxa_manga_follows
  add constraint rexxa_mf_has_id_chk check (
    mangadex_id is not null or mu_id is not null
    or (source in ('shinigami', 'komiku', 'kiryuu') and manga_id like source || ':%')
  );

notify pgrst, 'reload schema';
