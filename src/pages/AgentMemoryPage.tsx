import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send, Settings2, Plug, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth';
import { MemoryDashboard } from '@/components/memory/MemoryDashboard';
import {
  MemoryService,
  getGatewayUrl,
  setGatewayUrl,
  DEFAULT_GATEWAY_URL,
} from '@/services/memoryService';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  saved: boolean | null;
}

type GatewayState = 'unknown' | 'online' | 'offline' | 'checking';

const AgentMemoryPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  const sessionId = useMemo(
    () => `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [baseUrl, setBaseUrl] = useState(getGatewayUrl());
  const [status, setStatus] = useState<GatewayState>('unknown');
  const [refreshToken, setRefreshToken] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const checkGateway = async () => {
    setStatus('checking');
    const res = await MemoryService.ping();
    setStatus(res.success ? 'online' : 'offline');
  };

  useEffect(() => {
    checkGateway();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    const turn: ChatTurn = {
      id: `${Date.now()}`,
      role: 'user',
      content,
      saved: null,
    };
    setTurns((prev) => [...prev, turn]);
    setDraft('');
    setSending(true);

    const res = await MemoryService.saveConversation(sessionId, 'user', content, userId);
    setTurns((prev) =>
      prev.map((t) => (t.id === turn.id ? { ...t, saved: res.success } : t))
    );
    setStatus(res.success ? 'online' : 'offline');
    setSending(false);
    if (res.success) setRefreshToken((n) => n + 1);
  };

  const saveSettings = () => {
    setGatewayUrl(baseUrl || DEFAULT_GATEWAY_URL);
    setBaseUrl(getGatewayUrl());
    setShowSettings(false);
    checkGateway();
    setRefreshToken((n) => n + 1);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agent Memory</h1>
          <p className="text-sm text-muted-foreground">
            TencentDB Agent Memory gateway — L0 Conversation → L1 Atom → L2 Scenario → L3 Persona.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={status === 'online' ? 'default' : status === 'offline' ? 'destructive' : 'secondary'}
            className="gap-1"
          >
            {status === 'checking' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : status === 'online' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {status === 'online' ? 'Gateway online' : status === 'checking' ? 'Checking…' : 'Gateway offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setShowSettings((s) => !s)}>
            <Settings2 className="mr-1 h-4 w-4" />
            Settings
          </Button>
        </div>
      </header>

      {showSettings && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" />
              Gateway endpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={DEFAULT_GATEWAY_URL}
              className="max-w-md"
              aria-label="Memory gateway base URL"
            />
            <Button onClick={saveSettings}>Save</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setBaseUrl(DEFAULT_GATEWAY_URL);
                setGatewayUrl(DEFAULT_GATEWAY_URL);
                checkGateway();
              }}
            >
              Reset to local
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              Run locally: <code>docker run -p 8420:8420 tencentcloud/tencentdb-agent-memory:latest</code>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversation (L0 ingest)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <ScrollArea className="h-[380px] pr-3">
              {turns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Messages sent here are written straight to the L0 tier and distilled by the gateway.
                </p>
              ) : (
                <ul className="space-y-2">
                  {turns.map((t) => (
                    <li key={t.id} className="rounded-md border border-border bg-muted/40 p-2 text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {t.role}
                        </Badge>
                        {t.saved === true && (
                          <span className="text-[10px] text-muted-foreground">stored</span>
                        )}
                        {t.saved === false && (
                          <span className="text-[10px] text-destructive">not stored</span>
                        )}
                      </div>
                      <p className="break-words">{t.content}</p>
                    </li>
                  ))}
                </ul>
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
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <MemoryDashboard userId={userId} refreshToken={refreshToken} />
      </div>
    </main>
  );
};

export default AgentMemoryPage;
