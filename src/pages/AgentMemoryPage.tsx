import { useEffect, useMemo, useState } from 'react';
import { Loader2, Settings2, Plug, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { MemoryDashboard } from '@/components/memory/MemoryDashboard';
import { MemoryChat } from '@/components/memory/MemoryChat';
import {
  MemoryService,
  getGatewayUrl,
  setGatewayUrl,
  DEFAULT_GATEWAY_URL,
} from '@/services/memoryService';

type GatewayState = 'unknown' | 'online' | 'offline' | 'checking';

const GUEST_KEY = 'mmora.memoryGateway.guestId';

const resolveGuestId = (): string => {
  try {
    const existing = localStorage.getItem(GUEST_KEY);
    if (existing) return existing;
    const fresh = `guest-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GUEST_KEY, fresh);
    return fresh;
  } catch {
    return 'guest';
  }
};

const AgentMemoryPage = () => {
  const { user } = useAuth();
  const userId = useMemo(() => user?.id ?? resolveGuestId(), [user?.id]);
  const sessionId = useMemo(
    () => `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  const [showSettings, setShowSettings] = useState(false);
  const [baseUrl, setBaseUrl] = useState(getGatewayUrl());
  const [status, setStatus] = useState<GatewayState>('unknown');
  const [refreshToken, setRefreshToken] = useState(0);

  const checkGateway = async () => {
    setStatus('checking');
    const res = await MemoryService.ping();
    setStatus(res.success ? 'online' : 'offline');
    return res.success;
  };

  useEffect(() => {
    checkGateway();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Light poll only while the gateway is reachable, so an offline gateway
  // never generates a stream of failing requests.
  useEffect(() => {
    if (status !== 'online') return;
    const id = window.setInterval(() => setRefreshToken((n) => n + 1), 15000);
    return () => window.clearInterval(id);
  }, [status]);

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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MemoryChat
            userId={userId}
            sessionId={sessionId}
            onGatewayResult={(online) => setStatus(online ? 'online' : 'offline')}
            onStored={() => setRefreshToken((n) => n + 1)}
          />
        </div>

        <div className="lg:col-span-2">
          <MemoryDashboard userId={userId} refreshToken={refreshToken} />
        </div>
      </div>

    </main>
  );
};

export default AgentMemoryPage;
