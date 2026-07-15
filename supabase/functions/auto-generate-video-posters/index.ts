// Background job: scan posts for videos missing a poster and generate a private,
// deterministic auto-poster. Storage writes are service-role only; clients read
// through signed URLs gated by Storage RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "post-auto-posters";
const BATCH = 25;
const PRIVATE_PREFIX = `private://${BUCKET}/`;

function svgPoster(label = "Video") {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#123047"/>
      <stop offset="50%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="720" height="1280" fill="url(#g)"/>
  <circle cx="360" cy="580" r="120" fill="rgba(255,255,255,0.22)"/>
  <polygon points="326,510 326,650 450,580" fill="#fff"/>
</svg>`;
  return new TextEncoder().encode(svg);
}

const isDuplicateUpload = (error: { message?: string; statusCode?: string | number } | null) => {
  const message = error?.message?.toLowerCase() || "";
  return error?.statusCode === "409" || message.includes("already exists") || message.includes("duplicate");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: rows, error } = await supabase
      .from("posts")
      .select("id, media_url, media_type, media_preview_url")
      .or("media_preview_url.is.null,media_preview_url.like.%/storage/v1/object/public/posts/auto-posters/%")
      .or("media_type.eq.video,media_url.like.data:video/%,media_url.ilike.%.mp4%,media_url.ilike.%.webm%,media_url.ilike.%.mov%,media_url.ilike.%.ogg%,media_url.ilike.%.m4v%")
      .order("created_at", { ascending: false })
      .limit(BATCH);

    if (error) throw error;

    const results: Array<{ id: string; ok: boolean; error?: string; url?: string }> = [];

    for (const row of rows ?? []) {
      const src = row.media_url;
      // Only process rows where the media is/looks like a video.
      const looksVideo =
        row.media_type === "video" ||
        (typeof src === "string" && /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(src)) ||
        (typeof src === "string" && src.startsWith("data:video/"));
      if (!looksVideo) {
        results.push({ id: row.id, ok: false, error: "not a video" });
        continue;
      }

      const bytes = svgPoster("Preview");
      const path = `auto-posters/${row.id}.svg`;
      const privateUrl = `${PRIVATE_PREFIX}${path}`;

      if (row.media_preview_url === privateUrl) {
        results.push({ id: row.id, ok: true, url: privateUrl });
        continue;
      }

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: "image/svg+xml", upsert: false });

      if (upErr && !isDuplicateUpload(upErr)) {
        results.push({ id: row.id, ok: false, error: `upload: ${upErr.message}` });
        continue;
      }

      const { error: updErr } = await supabase
        .from("posts")
        .update({ media_preview_url: privateUrl })
        .eq("id", row.id)
        .or("media_preview_url.is.null,media_preview_url.like.%/storage/v1/object/public/posts/auto-posters/%"); // avoid overwriting a real poster added meanwhile

      if (updErr) {
        results.push({ id: row.id, ok: false, error: `update: ${updErr.message}` });
        continue;
      }

      results.push({ id: row.id, ok: true, url: privateUrl });
    }

    console.log("[auto-generate-video-posters]", JSON.stringify({ processed: results.length, ok: results.filter(r => r.ok).length }));

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[auto-generate-video-posters] failed", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
