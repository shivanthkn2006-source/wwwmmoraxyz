import { useEffect, useMemo, useState } from 'react';
import { Loader2, Settings2, Plug, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { MemoryDashboard } from '@/components/memory/MemoryDashboard';
import { MemoryChat } from '@/components/memory/MemoryChat';
import {
  MemoryService,
  getGatewayUrl,
  setGatewayUrl,
  getGatewayApiKey,
  setGatewayApiKey,
  getGatewayServiceId,
  setGatewayServiceId,
  DEFAULT_GATEWAY_URL,
} from '@/services/memoryService';

type GatewayState = 'unknown' | 'online' | 'offline' | 'checking' | 'unauthorized';

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

const STATUS_LABEL: Record<GatewayState, string> = {
  unknown: 'Gateway offline',
  online: 'Gateway online',
  offline: 'Gateway offline',
  checking: 'Checking…',
  unauthorized: 'Auth required',
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
  const [apiKey, setApiKey] = useState(getGatewayApiKey());
  const [serviceId, setServiceId] = useState(getGatewayServiceId());
  const [status, setStatus] = useState<GatewayState>('unknown');
  const [refreshToken, setRefreshToken] = useState(0);

  const checkGateway = async () => {
    setStatus('checking');
    const res = await MemoryService.ping();
    setStatus(res.success ? 'online' : res.unauthorized ? 'unauthorized' : 'offline');
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
    setGatewayApiKey(apiKey);
    setGatewayServiceId(serviceId);
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
            variant={
              status === 'online'
                ? 'default'
                : status === 'checking' || status === 'unauthorized'
                  ? 'secondary'
                  : 'destructive'
            }
            className="gap-1"
          >
            {status === 'checking' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : status === 'online' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : status === 'unauthorized' ? (
              <KeyRound className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {STATUS_LABEL[status]}
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
              Gateway connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="gw-url" className="text-xs">Base URL</Label>
                <Input
                  id="gw-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={DEFAULT_GATEWAY_URL}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gw-key" className="text-xs">API key (TDAI_GATEWAY_API_KEY)</Label>
                <Input
                  id="gw-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="leave empty if auth is disabled"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gw-sid" className="text-xs">Service id (x-tdai-service-id)</Label>
                <Input
                  id="gw-sid"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  placeholder="memory instance id"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={saveSettings}>Save &amp; test</Button>
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
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Run the gateway locally</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
{`git clone https://github.com/TencentCloud/TencentDB-Agent-Memory
cd TencentDB-Agent-Memory/MemoryCore && docker build -t memory-core:local .
docker run -p 8420:8420 -e TDAI_GATEWAY_HOST=0.0.0.0 \\
  -e TDAI_LLM_API_KEY=... -e TDAI_LLM_BASE_URL=... -e TDAI_LLM_MODEL=... \\
  -e TDAI_GATEWAY_API_KEY=... \\
  -v ./tdai-gateway.yaml:/data/config/tdai-gateway.yaml:ro memory-core:local`}
              </pre>
              <p className="mt-2">
                Set <code>server.corsOrigins</code> in <code>tdai-gateway.yaml</code> to include this
                origin, otherwise the browser blocks every call. Local development only —
                <code> localhost:8420</code> is unreachable from the published https site.
              </p>
            </div>
          </CardContent>
        </Card>
      )}


      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MemoryChat
            userId={userId}
            sessionId={sessionId}
            onGatewayResult={(result) => setStatus(result)}
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
