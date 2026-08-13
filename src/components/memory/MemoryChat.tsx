import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import {
  MemoryService,
  normaliseAtoms,
  extractPersonaText,
} from '@/services/memoryService';

export interface MemoryChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** null = pending, true = round written to L0, false = gateway unavailable */
  saved: boolean | null;
}

export type GatewayResult = 'online' | 'offline' | 'unauthorized';

interface MemoryChatProps {
  userId: string;
  sessionId: string;
  /** Reports gateway reachability after each write so the page can show status. */
  onGatewayResult?: (result: GatewayResult) => void;
  /** Called after a successful L0 write so the dashboard can refresh. */
  onStored?: () => void;
}

export const MemoryChat = ({
  userId,
  sessionId,
  onGatewayResult,
  onStored,
}: MemoryChatProps) => {
  const [turns, setTurns] = useState<MemoryChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, sending]);

  // Flush the session on unmount so the gateway runs L1 -> L3 distillation.
  useEffect(() => {
    return () => {
      void MemoryService.endSession(sessionId, userId);
    };
  }, [sessionId, userId]);

  const markSaved = (ids: string[], saved: boolean) =>
    setTurns((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, saved } : t))
    );

  /** Pull grounding context: /recall first, /search/memories as fallback. */
  const loadMemoryContext = async (query: string): Promise<string> => {
    try {
      const recalled = await MemoryService.recall(query, sessionId, userId);
      const context = recalled.success ? recalled.data?.context?.trim() : '';
      if (context) return context;

      const [factsRes, personaRes] = await Promise.all([
        MemoryService.searchMemories(query, 5),
        MemoryService.getPersona(),
      ]);

      const parts: string[] = [];
      if (personaRes.success) {
        const persona = extractPersonaText(personaRes.data ?? null);
        if (persona) parts.push(`Known persona: ${persona}`);
      }
      if (factsRes.success) {
        const atoms = normaliseAtoms(factsRes.data);
        if (atoms.length) {
          parts.push(
            `Relevant remembered facts:\n${atoms
              .slice(0, 5)
              .map((a) => `- ${a.content}`)
              .join('\n')}`
          );
        }
      }
      return parts.join('\n\n');
    } catch {
      return '';
    }
  };

  const runTurn = async (content: string) => {
    setSending(true);
    setReplyError(null);
    setLastPrompt(content);

    const userTurnId = `${Date.now()}-u`;
    setTurns((prev) => [
      ...prev,
      { id: userTurnId, role: 'user', content, saved: null },
    ]);

    const memoryContext = await loadMemoryContext(content);

    try {
      const history = turns.map((t) => ({ role: t.role, content: t.content }));
      const messages = [
        ...(memoryContext
          ? [
              {
                role: 'system' as const,
                content: `Long-term memory about this user:\n${memoryContext}`,
              },
            ]
          : []),
        ...history,
        { role: 'user' as const, content },
      ];

      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: {
          messages,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        },
      });

      if (error) throw error;
      const reply: string =
        data?.message || data?.response || "I'm here — say that again?";

      const assistantTurnId = `${Date.now()}-a`;
      setTurns((prev) => [
        ...prev,
        { id: assistantTurnId, role: 'assistant', content: reply, saved: null },
      ]);

      // One /capture per completed round (user + assistant together).
      void (async () => {
        const res = await MemoryService.captureRound(
          sessionId,
          content,
          reply,
          userId
        );
        markSaved([userTurnId, assistantTurnId], res.success);
        onGatewayResult?.(
          res.success ? 'online' : res.unauthorized ? 'unauthorized' : 'offline'
        );
        if (res.success) onStored?.();
      })();
    } catch (err) {
      markSaved([userTurnId], false);
      setReplyError(
        err instanceof Error ? err.message : 'Zoe could not answer right now.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setDraft('');
    await runTurn(content);
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conversation (L0 ingest)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <ScrollArea className="h-[460px] pr-3">
          {turns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Each completed round is written to the L0 tier and distilled by the gateway
              into facts, scenarios and a persona you can watch build up on the right.
            </p>
          ) : (
            <ul className="space-y-3">
              {turns.map((t) => (
                <li
                  key={t.id}
                  className={
                    t.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                      : 'max-w-[90%] text-sm text-foreground'
                  }
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {t.role === 'user' ? 'you' : 'zoe'}
                    </Badge>
                    {t.saved === true && (
                      <span className="text-[10px] text-muted-foreground">stored</span>
                    )}
                    {t.saved === false && (
                      <span className="text-[10px] text-destructive">not stored</span>
                    )}
                  </div>
                  {t.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{t.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{t.content}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {sending && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Zoe is thinking…
            </p>
          )}

          {replyError && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span className="flex-1">{replyError}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => lastPrompt && runTurn(lastPrompt)}
                disabled={sending || !lastPrompt}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            </div>
          )}

          <div ref={endRef} />
        </ScrollArea>

        <form className="flex gap-2" onSubmit={handleSend}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Say something to remember…"
            aria-label="Message to store in memory"
          />
          <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MemoryChat;
