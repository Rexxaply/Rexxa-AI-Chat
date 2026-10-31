-- REXXA AI · tabel sinkronisasi (jalankan sekali di SQL Editor)
create table if not exists public.rexxa_items (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null,            -- chat | profile | meta | usage
  id         text not null,
  data       jsonb,
  updated_at bigint not null default 0,
  deleted    boolean not null default false,
  synced_at  timestamptz not null default clock_timestamp(),
  primary key (user_id, kind, id)
);
create index if not exists rexxa_items_sync_idx on public.rexxa_items (user_id, synced_at);

alter table public.rexxa_items enable row level security;
drop policy if exists "rexxa_select" on public.rexxa_items;
drop policy if exists "rexxa_insert" on public.rexxa_items;
drop policy if exists "rexxa_update" on public.rexxa_items;
drop policy if exists "rexxa_delete" on public.rexxa_items;
create policy "rexxa_select" on public.rexxa_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "rexxa_insert" on public.rexxa_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "rexxa_update" on public.rexxa_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "rexxa_delete" on public.rexxa_items for delete to authenticated using ((select auth.uid()) = user_id);
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.rexxa_items to authenticated;

create or replace function public.rexxa_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.synced_at := clock_timestamp(); return new; end $$;
drop trigger if exists rexxa_touch on public.rexxa_items;
create trigger rexxa_touch before insert or update on public.rexxa_items
  for each row execute function public.rexxa_touch();

-- ruang database (untuk indikator di aplikasi)
create or replace function public.rexxa_storage() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'db_bytes',   pg_database_size(current_database()),
    'mine_bytes', coalesce((select sum(pg_column_size(t.data)) from public.rexxa_items t where t.user_id = (select auth.uid())), 0),
    'rows',       (select count(*) from public.rexxa_items t where t.user_id = (select auth.uid()))
  );
$$;
revoke all on function public.rexxa_storage() from public, anon;
grant execute on function public.rexxa_storage() to authenticated;

-- daftar item di cloud (untuk "Kelola data cloud")
create or replace function public.rexxa_items_list() returns table(kind text, id text, title text, messages int, bytes int, updated_at bigint, deleted boolean)
language sql stable security definer set search_path = '' as $$
  select t.kind, t.id, t.data->>'title',
         case when jsonb_typeof(t.data->'messages') = 'array' then jsonb_array_length(t.data->'messages') end,
         pg_column_size(t.data)::int, t.updated_at, t.deleted
  from public.rexxa_items t where t.user_id = (select auth.uid())
  order by t.updated_at desc;
$$;
revoke all on function public.rexxa_items_list() from public, anon;
grant execute on function public.rexxa_items_list() to authenticated;

-- hapus akun sinkron beserta semua datanya di cloud
create or replace function public.rexxa_delete_me() returns json
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); ok boolean := true;
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.rexxa_items where user_id = uid;
  begin delete from auth.users where id = uid; exception when others then ok := false; end;
  return json_build_object('user_deleted', ok);
end $$;
revoke all on function public.rexxa_delete_me() from public, anon;
grant execute on function public.rexxa_delete_me() to authenticated;

-- realtime: perubahan langsung muncul di perangkat lain
do $$ begin
  alter publication supabase_realtime add table public.rexxa_items;
exception when duplicate_object then null; end $$;
