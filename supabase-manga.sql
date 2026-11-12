-- REXXA AI · Notifikasi manga (jalankan sekali di SQL Editor, aman dijalankan ulang)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.rexxa_manga_follows (
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  manga_id        text not null,
  title           text,
  cover           text,
  langs           text[] not null default '{id,en}',
  notify          boolean not null default true,
  last_chapter    jsonb,
  last_chapter_at timestamptz,
  checked_at      timestamptz,
  created_at      timestamptz not null default now(),
  primary key (user_id, manga_id)
);
create table if not exists public.rexxa_manga_updates (
  user_id    uuid not null references auth.users(id) on delete cascade,
  chapter_id text not null,
  manga_id   text not null,
  data       jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);
create index if not exists rexxa_manga_updates_time on public.rexxa_manga_updates (user_id, created_at desc);
create table if not exists public.rexxa_push_subs (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  device     text,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);
-- kunci VAPID & secret cron: hanya bisa dibaca server (tanpa policy)
create table if not exists public.rexxa_private (k text primary key, v jsonb not null);

alter table public.rexxa_manga_follows enable row level security;
alter table public.rexxa_manga_updates enable row level security;
alter table public.rexxa_push_subs     enable row level security;
alter table public.rexxa_private       enable row level security;

drop policy if exists "mf_all" on public.rexxa_manga_follows;
create policy "mf_all" on public.rexxa_manga_follows for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "mu_read" on public.rexxa_manga_updates;
create policy "mu_read" on public.rexxa_manga_updates for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "mu_del" on public.rexxa_manga_updates;
create policy "mu_del" on public.rexxa_manga_updates for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "ps_all" on public.rexxa_push_subs;
create policy "ps_all" on public.rexxa_push_subs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.rexxa_manga_follows to authenticated;
grant select, delete on public.rexxa_manga_updates to authenticated;
grant select, insert, update, delete on public.rexxa_push_subs to authenticated;
revoke all on public.rexxa_private from anon, authenticated;

-- izin untuk Edge Function (service_role)
grant usage on schema public to service_role;
grant all on public.rexxa_private, public.rexxa_manga_follows, public.rexxa_manga_updates, public.rexxa_push_subs to service_role;

-- muat ulang cache skema API agar tabel baru langsung terlihat
notify pgrst, 'reload schema';

-- status jadwal (dibaca Edge Function)
create or replace function public.rexxa_cron_status() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'scheduled', exists (select 1 from cron.job where jobname = 'rexxa-manga-check'),
    'schedule',  (select schedule from cron.job where jobname = 'rexxa-manga-check' limit 1),
    'last_run',  (select max(d.start_time) from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'rexxa-manga-check'),
    'last_status', (select d.status from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'rexxa-manga-check' order by d.start_time desc limit 1)
  );
$$;
revoke all on function public.rexxa_cron_status() from public, anon, authenticated;
grant execute on function public.rexxa_cron_status() to service_role;
