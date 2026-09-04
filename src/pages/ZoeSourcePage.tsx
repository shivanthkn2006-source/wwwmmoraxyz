/**
 * INTERNAL SOURCE READER — every external result Zoe surfaces (web, news,
 * weather, search lanes) opens here instead of leaving the platform. The page
 * asks the `web-reader` Edge Function for the readable text and renders it in
 * the platform shell.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface ReaderPayload {
  ok?: boolean;
  title?: string;
  siteName?: string;
  description?: string;
  image?: string;
  publishedAt?: string;
  paragraphs?: string[];
}

export default function ZoeSourcePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const url = params.get('url') ?? '';
  const fallbackTitle = params.get('title') ?? '';
  const fallbackExcerpt = params.get('excerpt') ?? '';
  const sourceLabel = params.get('source') ?? '';

  const [payload, setPayload] = useState<ReaderPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('web-reader', { body: { url } });
        if (error) throw error;
        if (!cancelled) setPayload(data as ReaderPayload);
      } catch (err) {
        console.warn('[source-reader] failed', err);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const host = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return sourceLabel;
    }
  }, [url, sourceLabel]);

  const paragraphs = payload?.paragraphs?.length
    ? payload.paragraphs
    : [fallbackExcerpt || payload?.description || ''].filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <header className="mb-4">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-60">
          <Globe className="h-3.5 w-3.5" aria-hidden />
          {payload?.siteName || sourceLabel || host || 'Source'}
          {payload?.publishedAt ? ` · ${payload.publishedAt.slice(0, 10)}` : ''}
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          {payload?.title || fallbackTitle || host || 'Source'}
        </h1>
      </header>

      {payload?.image && (
        <img
          src={payload.image}
          alt=""
          loading="lazy"
          className="mb-4 max-h-72 w-full rounded-xl object-cover"
        />
      )}

      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm opacity-70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading the source inside mmora…
        </p>
      )}

      {!loading && paragraphs.length > 0 && (
        <article className="space-y-3 text-[15px] leading-relaxed opacity-90">
          {paragraphs.map((text, index) => (
            <p key={`${index}-${text.slice(0, 24)}`}>{text}</p>
          ))}
        </article>
      )}

      {!loading && paragraphs.length === 0 && (
        <p className="text-sm opacity-70">
          {failed
            ? 'This source could not be read right now. Try again in a moment.'
            : 'This source published no readable text.'}
        </p>
      )}

      {url && (
        <p className="mt-8 break-all text-[11px] opacity-50">Original address: {url}</p>
      )}
    </main>
  );
}
