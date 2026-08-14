import { useEffect, useMemo, useState } from 'react';
import { Loader2, Settings2, Plug, CheckCircle2, XCircle, KeyRound, Copy, FileCog, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
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
  type GatewayDiagnostic,
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
  const [diagnostic, setDiagnostic] = useState<GatewayDiagnostic | null>(null);
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
  const yamlBlock = `server:\n  host: 0.0.0.0\n  port: 8420\n  corsOrigins:\n    - "${browserOrigin}"`;
  const restartCommand = 'docker restart $(docker ps -q --filter ancestor=memory-core:local)';

  const checkGateway = async () => {
    setStatus('checking');
    const result = await MemoryService.diagnose();
    setDiagnostic(result);
    setStatus(result.ok ? 'online' : result.kind === 'unauthorized' ? 'unauthorized' : 'offline');
    return result.ok;
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

  const saveSettings = async () => {
    setGatewayUrl(baseUrl || DEFAULT_GATEWAY_URL);
    setGatewayApiKey(apiKey);
    setGatewayServiceId(serviceId);
    setBaseUrl(getGatewayUrl());
    await checkGateway();
    setRefreshToken((n) => n + 1);
  };

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const applyOriginToYaml = async () => {
    const picker = (window as Window & {
      showOpenFilePicker?: (options?: unknown) => Promise<Array<{
        getFile: () => Promise<File>;
        createWritable: () => Promise<{ write: (value: string) => Promise<void>; close: () => Promise<void> }>;
      }>>;
    }).showOpenFilePicker;

    if (!picker) {
      await copyText(yamlBlock, 'YAML copied — paste it into tdai-gateway.yaml.');
      return;
    }

    try {
      const handles = await picker({
        multiple: false,
        types: [{ description: 'YAML configuration', accept: { 'application/yaml': ['.yaml', '.yml'] } }],
      });
      const handle = handles[0];
      if (!handle) return;
      const file = await handle.getFile();
      const current = await file.text();
      const originsMatch = current.match(/corsOrigins:\s*\n((?:\s*-\s*[^\n]+\n?)*)/);
      const existingOrigins = originsMatch?.[1]
        ?.split('\n')
        .map((line) => line.replace(/^\s*-\s*/, '').replace(/["']/g, '').trim())
        .filter(Boolean) ?? [];
      const nextOrigins = Array.from(new Set([...existingOrigins, browserOrigin]));
      const originsYaml = `corsOrigins:\n${nextOrigins.map((origin) => `    - "${origin}"`).join('\n')}`;
      const updated = originsMatch
        ? current.replace(/corsOrigins:\s*\n(?:\s*-\s*[^\n]+\n?)*/, `${originsYaml}\n`)
        : `${current.trimEnd()}\nserver:\n  corsOrigins:\n    - "${browserOrigin}"\n`;
      const writable = await handle.createWritable();
      await writable.write(updated);
      await writable.close();
      setAllowedOrigins(nextOrigins);
      toast.success('Origin added to tdai-gateway.yaml. Restart the container next.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(error instanceof Error ? error.message : 'Could not update the YAML file.');
    }
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
              <Button onClick={saveSettings} disabled={status === 'checking'}>
                {status === 'checking' && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save &amp; test
              </Button>
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
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">Detected browser origin</p>
                <Button size="sm" variant="outline" onClick={applyOriginToYaml}>
                  <FileCog className="mr-1 h-3.5 w-3.5" /> Apply to YAML
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
                {yamlBlock}
              </pre>
              <p className="mt-2">
                Request Origin: <code>{browserOrigin}</code>. The
                gateway only accepts origins listed in <code>server.corsOrigins</code> — add the one
                above to <code>tdai-gateway.yaml</code> and restart the container.
                {typeof window !== 'undefined' &&
                  window.location.protocol === 'https:' &&
                  baseUrl.startsWith('http://') && (
                    <>
                      {' '}Also note this page is served over <strong>https</strong>: Safari and
                      Firefox block plain <code>http://localhost</code> calls entirely. Open the app
                      over <code>http://localhost:8080</code> (or use Chrome) to test the gateway.
                    </>
                  )}
              </p>
              {allowedOrigins.length > 0 && (
                <p className="mt-2">Allowed origins read from the selected file: <code>{allowedOrigins.join(', ')}</code></p>
              )}
            </div>

            {diagnostic && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                <div className="mb-2 flex items-center gap-2">
                  {diagnostic.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <p className="font-medium text-foreground">Health + auth result: {diagnostic.kind.toUpperCase()}</p>
                </div>
                <dl className="grid gap-1 text-muted-foreground sm:grid-cols-[130px_1fr]">
                  <dt>Health probe</dt><dd>{diagnostic.healthOk ? 'Passed' : 'Failed'}</dd>
                  <dt>Authenticated probe</dt><dd>{diagnostic.authOk ? 'Passed' : 'Failed'}</dd>
                  <dt>Origin</dt><dd className="break-all font-mono">{diagnostic.origin}</dd>
                  <dt>Request URL</dt><dd className="break-all font-mono">{diagnostic.requestUrl}</dd>
                  <dt>Preflight headers</dt><dd className="break-all font-mono">{diagnostic.requiredHeaders.join(', ')}</dd>
                  <dt>Failure reason</dt><dd>{diagnostic.summary}</dd>
                  <dt>Browser detail</dt><dd className="break-all font-mono">{diagnostic.detail}</dd>
                  <dt>Allowed origins</dt><dd className="font-mono">{allowedOrigins.length ? allowedOrigins.join(', ') : 'Unknown until you select tdai-gateway.yaml'}</dd>
                </dl>
              </div>
            )}

            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">Restart the local gateway</p>
                <Button size="sm" variant="outline" onClick={() => copyText(restartCommand, 'Restart command copied. Paste it into Terminal.')}>
                  <RotateCw className="mr-1 h-3.5 w-3.5" /> Restart gateway
                </Button>
              </div>
              <p className="mb-2">For security, a browser cannot execute Docker. This button copies the exact restart command for Terminal.</p>
              <pre className="mb-3 whitespace-pre-wrap break-words font-mono text-[11px]">{restartCommand}</pre>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">Run the gateway locally</p>
                <Button size="sm" variant="ghost" onClick={() => copyText(yamlBlock, 'YAML copied.')}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy YAML
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
{`git clone https://github.com/TencentCloud/TencentDB-Agent-Memory
cd TencentDB-Agent-Memory/MemoryCore && docker build -t memory-core:local .
docker run -p 8420:8420 -e TDAI_GATEWAY_HOST=0.0.0.0 \\
  -e TDAI_LLM_API_KEY=... -e TDAI_LLM_BASE_URL=... -e TDAI_LLM_MODEL=... \\
  -e TDAI_GATEWAY_API_KEY=... \\
  -v ./tdai-gateway.yaml:/data/config/tdai-gateway.yaml:ro memory-core:local`}
              </pre>
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
