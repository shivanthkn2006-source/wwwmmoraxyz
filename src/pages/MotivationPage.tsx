/** TODAY'S MOTIVATION — Zoe's daily insight, member votes, and a rerun button. */
import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, RefreshCw, Quote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useZoeMotivation } from '@/hooks/useZoeMotivation';
import { insightForDate } from '@/lib/curatedInsights';
import { useDailyQuote } from '@/hooks/useDailyQuote';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const MotivationPage = () => {
  const [reloadKey, setReloadKey] = useState(0);
  const { motivation, posterUrl, userId, loading } = useZoeMotivation(reloadKey);
  const { vote, cast, stats } = useMotivationVote(motivation?.id, userId);
  const [rerunning, setRerunning] = useState(false);
  const curated = insightForDate();
  const daily = useDailyQuote();

  const castVote = async (value: 1 | -1) => {
    if (!(await cast(value))) toast.error('Could not save your vote.');
  };

  const rerun = async () => {
    setRerunning(true);
    const { data, error } = await supabase.functions.invoke('zoe-motivation', {
      body: { action: 'regenerate', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });
    setRerunning(false);
    if (error || data?.ok === false) { toast.error('Zoe could not rerun it right now. Try again shortly.'); return; }
    toast.success('Fresh motivation ready.');
    setReloadKey((k) => k + 1);
  };

  const headline = motivation?.headline?.trim() || "Today's insight";
  const body = motivation?.body?.trim();
  const quote = daily.quote || curated.quote;
  const author = daily.author || curated.author;

  return (
    <div className="profile-liquid-page min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Today's motivation</h1>
          <Button variant="outline" size="sm" onClick={rerun} disabled={rerunning || loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${rerunning ? 'animate-spin' : ''}`} />
            {rerunning ? 'Rerunning…' : 'Rerun'}
          </Button>
        </header>

        <Card className="overflow-hidden">
          {posterUrl && <img src={posterUrl} alt={headline} className="h-56 w-full object-cover" />}
          <div className="space-y-4 p-5">
            {loading ? (
              <p className="text-sm text-muted-foreground">Zoe is preparing today's insight…</p>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-foreground">{headline}</h2>
                {body && <p className="leading-relaxed text-foreground/90">{body}</p>}
                {motivation?.action_step && (
                  <p className="border-l-2 border-primary pl-3 text-sm text-foreground">{motivation.action_step}</p>
                )}
                <div className="flex items-start gap-2 text-sm italic text-foreground/90">
                  <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>&ldquo;{quote}&rdquo;{author && <span className="not-italic text-muted-foreground"> — {author}</span>}</p>
                </div>
                <p className="text-xs text-muted-foreground" data-quote-source>
                  Quote of the day from{' '}
                  {daily.sourceUrl ? <a href={daily.sourceUrl} target="_blank" rel="noreferrer" className="underline">{daily.source}</a> : daily.source}
                </p>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant={vote === 1 ? 'default' : 'outline'} size="sm" onClick={() => castVote(1)} disabled={!motivation?.id} aria-label="Helpful">
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button variant={vote === -1 ? 'default' : 'outline'} size="sm" onClick={() => castVote(-1)} disabled={!motivation?.id} aria-label="Not helpful">
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MotivationPage;
