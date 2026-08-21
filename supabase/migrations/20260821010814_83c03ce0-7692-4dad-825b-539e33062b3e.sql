update public.zoe_universal_index
set metadata = jsonb_strip_nulls(
      metadata
      || jsonb_build_object(
           'mediaUrl',
           case when metadata->>'mediaUrl' like 'data:%' then 'inline' else metadata->>'mediaUrl' end,
           'previewUrl',
           case when metadata->>'previewUrl' like 'data:%' then 'inline' else metadata->>'previewUrl' end
         )
    )
where metadata->>'mediaUrl' like 'data:%' or metadata->>'previewUrl' like 'data:%';