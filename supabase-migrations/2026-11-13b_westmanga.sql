-- =====================================================================
-- REXXA AI · Migration tahap 6: sumber WestManga (Edge Function rexxa-manga v1.9.0)
-- File baru: supabase-migrations/2026-11-13b_westmanga.sql
-- Aman dijalankan berulang. Jalankan SETELAH 2026-11-13_web_sources.sql.
-- =====================================================================

alter table public.rexxa_manga_follows drop constraint if exists rexxa_mf_source_chk;
alter table public.rexxa_manga_follows
  add constraint rexxa_mf_source_chk check (source in ('mangadex', 'mangaupdates', 'shinigami', 'komiku', 'kiryuu', 'westmanga'));

alter table public.rexxa_manga_updates drop constraint if exists rexxa_mu_source_chk;
alter table public.rexxa_manga_updates
  add constraint rexxa_mu_source_chk check (source in ('mangadex', 'mangaupdates', 'shinigami', 'komiku', 'kiryuu', 'westmanga'));

alter table public.rexxa_manga_follows drop constraint if exists rexxa_mf_has_id_chk;
alter table public.rexxa_manga_follows
  add constraint rexxa_mf_has_id_chk check (
    mangadex_id is not null or mu_id is not null
    or (source in ('shinigami', 'komiku', 'kiryuu', 'westmanga') and manga_id like source || ':%')
  );

notify pgrst, 'reload schema';
