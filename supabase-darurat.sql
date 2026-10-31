-- DARURAT: database penuh (read-only). Hapus semua gambar dari chat, teks tetap aman.
-- Jalankan di SQL Editor Supabase.
set session characteristics as transaction read write;

update public.rexxa_items t
set data = jsonb_set(t.data, '{messages}', (
      select coalesce(jsonb_agg(
        case when jsonb_typeof(x.m->'images') = 'array' and jsonb_array_length(x.m->'images') > 0
             then (x.m - 'images' - 'imagesOmitted') || jsonb_build_object(
                    'images', '[]'::jsonb,
                    'imagesRemoved', coalesce((x.m->>'imagesRemoved')::int, 0) + jsonb_array_length(x.m->'images'))
             else x.m end
        order by x.ord), '[]'::jsonb)
      from jsonb_array_elements(t.data->'messages') with ordinality as x(m, ord))),
    updated_at = (extract(epoch from clock_timestamp()) * 1000)::bigint
where t.kind = 'chat' and not t.deleted
  and jsonb_typeof(t.data->'messages') = 'array'
  and exists (select 1 from jsonb_array_elements(t.data->'messages') e(m)
              where jsonb_typeof(e.m->'images') = 'array' and jsonb_array_length(e.m->'images') > 0);

-- Setelah itu jalankan TERPISAH (query baru):
-- vacuum full public.rexxa_items;
