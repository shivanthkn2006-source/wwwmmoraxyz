create or replace function public.zoe_prefix_search(query_text text, match_count integer default 20)
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
security invoker
set search_path to 'public','extensions'
as $$
with params as (
  select
    nullif(btrim(coalesce(query_text,'')),'') as raw_q,
    greatest(1, least(coalesce(match_count,20), 50)) as safe_count
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
),
ranked as (
  select
    i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight,
    (
      coalesce(ts_rank_cd(i.fts, t.q), 0)
      + case when i.content_synthesis ilike '%' || t.raw_q || '%' then 0.5 else 0 end
      + case when coalesce(i.metadata->>'title','') ilike t.raw_q || '%' then 0.8 else 0 end
      + case when coalesce(i.metadata->>'visualIndexed','false') = 'true' then 0.1 else 0 end
    )::double precision * coalesce(i.social_weight, 1.0) as result_score,
    row_number() over (
      partition by i.entity_type
      order by
        (case when coalesce(i.metadata->>'title','') ilike t.raw_q || '%' then 1 else 0 end) desc,
        ts_rank_cd(i.fts, t.q) desc,
        i.updated_at desc
    ) as type_rank
  from public.zoe_universal_index i, tsq t
  where i.fts @@ t.q or i.content_synthesis ilike '%' || t.raw_q || '%'
)
select r.id, r.entity_type, r.entity_id, r.content_synthesis, r.metadata, r.social_weight, r.result_score
from ranked r
where r.type_rank <= 4
order by r.result_score desc, r.type_rank, r.entity_type
limit (select safe_count from tsq);
$$;

revoke execute on function public.zoe_prefix_search(text, integer) from public, anon;
grant execute on function public.zoe_prefix_search(text, integer) to authenticated, service_role;