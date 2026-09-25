import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, MessageCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import PageSeo from '@/components/seo/PageSeo';

type HistoryMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

type HistoryTurn = {
  id: string;
  at: string;
  question: HistoryMessage;
  answer?: HistoryMessage;
  forecast: boolean;
};

const FORECAST_TERMS = /\b(career|job|money|wealth|finance|love|relationship|family|health|future|forecast|projection|dasha|planet|month|week|year|wish|admission|marriage)\b/i;

function pairTurns(messages: HistoryMessage[]): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;
    const next = messages[index + 1];
    const answer = next?.role === 'assistant' ? next : undefined;
    const combined = `${message.content} ${answer?.content ?? ''}`;
    turns.push({
      id: message.id,
      at: message.created_at,
      question: message,
      answer,
      forecast: FORECAST_TERMS.test(combined),
    });
  }
  return turns.reverse();
}

export default function ZoeChatHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastOnly, setForecastOnly] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('ai_companion_messages')
      .select('id, role, content, created_at')
      .eq('user_id', user.id)
      .or('variant.is.null,variant.eq.zoe_classic')
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(500);

    if (loadError) setError(loadError.message);
    else setMessages((data ?? []).filter((message) => Boolean(message.content?.trim())));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id]);

  const turns = useMemo(() => {
    const all = pairTurns(messages);
    return forecastOnly ? all.filter((turn) => turn.forecast) : all;
  }, [messages, forecastOnly]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <PageSeo title="Zoe Chat History — M'Mora" description="Browse your saved Zoe conversations and life-forecast questions." />
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">Zoe chat history</h1>
            <p className="text-xs text-muted-foreground">Typed and spoken M'Mora conversations</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void load()} disabled={loading} aria-label="Refresh history">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="mx-auto flex max-w-3xl gap-2 px-4 pb-3">
          <Button size="sm" variant={forecastOnly ? 'ghost' : 'secondary'} onClick={() => setForecastOnly(false)}>
            <MessageCircle className="mr-2 h-4 w-4" />All conversations
          </Button>
          <Button size="sm" variant={forecastOnly ? 'secondary' : 'ghost'} onClick={() => setForecastOnly(true)}>
            <CalendarDays className="mr-2 h-4 w-4" />Life forecasts
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5">
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">History could not load: {error}</p>}
        {loading && turns.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Loading conversations…</p>}
        {!loading && turns.length === 0 && (
          <div className="py-16 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No saved conversations yet.</p>
            <Button className="mt-4" onClick={() => navigate('/zoe-ai')}>Talk with Zoe</Button>
          </div>
        )}
        {turns.map((turn) => (
          <article key={turn.id} className="border-b border-border/50 pb-6">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <time dateTime={turn.at}>{new Date(turn.at).toLocaleString()}</time>
              {turn.forecast && <span>Life forecast</span>}
            </div>
            <div className="ml-auto max-w-[88%] rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground">
              {turn.question.content}
            </div>
            {turn.answer && (
              <div className="mt-3 max-w-[94%] whitespace-pre-wrap text-sm leading-6 text-foreground">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Zoe</span>
                {turn.answer.content}
              </div>
            )}
          </article>
        ))}
      </main>
    </div>
  );
}