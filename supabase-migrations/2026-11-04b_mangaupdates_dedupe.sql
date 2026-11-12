-- =====================================================================
-- REXXA AI · Migration tahap 4: dedupe lintas sumber & jadwal MangaUpdates
-- File baru: supabase-migrations/2026-11-04b_mangaupdates_dedupe.sql
-- Aman dijalankan berulang. Jalankan SETELAH 2026-11-04_mangaupdates.sql.
-- =====================================================================

-- Kapan seri MangaUpdates terakhir dicek (untuk membagi beban: maks. 40 seri per jalan cron)
alter table public.rexxa_manga_follows
  add column if not exists mu_checked_at timestamptz;

-- Index unik penuh (bukan parsial) agar bisa dipakai sebagai target ON CONFLICT oleh Edge Function.
-- NULL dianggap berbeda, jadi baris lama (chapter_key kosong) tetap aman.
create unique index if not exists rexxa_mu_dedupe_full
  on public.rexxa_manga_updates (user_id, manga_id, lang, chapter_key);
drop index if exists public.rexxa_mu_dedupe_uniq;

notify pgrst, 'reload schema';
