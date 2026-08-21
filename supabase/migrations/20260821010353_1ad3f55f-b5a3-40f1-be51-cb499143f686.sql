create or replace function public.zoe_prefix_search(query_text text, match_count integer default 12)
returns table (
  id uuid,
  entity_type text,
  entity_id uuid,
  content_synthesis text,
  metadata jsonb,
  social_weight double precision,
  score double precision
)
language sql
stable
set search_path to 'public','extensions'
as $$
with params as (
  select
    nullif(btrim(coalesce(query_text,'')),'') as raw_q,
    greatest(1, least(coalesce(match_count,12), 50)) as safe_count
),
tsq as (
  select p.raw_q, p.safe_count,
    to_tsquery('english',
      array_to_string(
        array(
          select regexp_replace(tok, '[^a-zA-Z0-9]', '', 'g') || ':*'
          from unnest(string_to_array(lower(p.raw_q), ' ')) tok
          where regexp_replace(tok, '[^a-zA-Z0-9]', '', 'g') <> ''
        ),
        ' & '
      )
    ) as q
  from params p
  where p.raw_q is not null
)
select
  i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight,
  (
    coalesce(ts_rank_cd(i.fts, t.q), 0)
    + case when i.content_synthesis ilike '%' || t.raw_q || '%' then 0.5 else 0 end
    + case when i.entity_type = 'profile' then 0.2 else 0 end
  )::double precision * coalesce(i.social_weight, 1.0) as score
from public.zoe_universal_index i, tsq t
where i.fts @@ t.q or i.content_synthesis ilike '%' || t.raw_q || '%'
order by score desc, i.created_at desc
limit (select safe_count from tsq);
$$;

grant execute on function public.zoe_prefix_search(text, integer) to authenticated, service_role;