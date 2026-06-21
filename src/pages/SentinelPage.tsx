// ═══════════════════════════════════════════════════════════════════════════════
// M'MORA SENTINEL - Satellite Intelligence Hub
// Step 1-5: UI Shell + Globe + Voice + Deep Scan + Live Sky Layer
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Satellite, ChevronLeft, ChevronRight, Radio,
  Activity, Shield, Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import ZoeSatelliteGlobe from '@/components/sentinel/ZoeSatelliteGlobe';

type GlobePoint = {
  id: string;
  lat: number;
  lng: number;
  event: string;
  altitude?: number;
  radius?: number;
  color?: string;
  source?: 'intelligence' | 'flight';
  heading?: number;
};

const SKY_SIM_LOG = '> ZOE PROTOCOL: Live OpenSky data restored via secure proxy. Planes are clickable.';

// ── Sentinel Error Boundary ──────────────────────────────────────────────────
class SentinelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Sentinel] System failure:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
          <div className="text-center space-y-4 p-8 rounded-2xl border border-destructive/30 bg-card/60 backdrop-blur-xl max-w-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-wider">ZOE SYSTEM OFFLINE</h1>
            <p className="text-sm text-muted-foreground font-mono">
              Sentinel subsystem encountered a critical fault.
            </p>
            <p className="text-xs text-muted-foreground/70 font-mono break-all">
              {this.state.error?.message}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reinitialize System
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Zoe Data Feed Sidebar ────────────────────────────────────────────────────
const ZoeDataFeed: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
  events: GlobePoint[];
  logs: string[];
  flightCount: number;
}> = ({ isOpen, onToggle, events, logs, flightCount }) => {
  const feedItems = [
    { id: 1, label: 'Neural Link', value: '98.2%' },
    { id: 2, label: 'Sat Uplink', value: 'CONNECTED' },
    { id: 3, label: 'Threat Level', value: 'LOW' },
    { id: 4, label: 'Live Flights', value: String(flightCount) },
  ];

  return (
    <>
      <button
        onClick={onToggle}
        className={cn(
          'fixed top-1/2 -translate-y-1/2 z-40 p-2 rounded-r-lg',
          'bg-card/40 backdrop-blur-md border border-border/40 border-l-0',
          'text-foreground/70 hover:text-foreground hover:bg-card/70 transition-all',
          isOpen ? 'left-72 md:left-80' : 'left-0'
        )}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed top-0 left-0 h-full z-30',
              'w-72 md:w-80',
              'bg-card/30 backdrop-blur-xl',
              'border-r border-border/40',
              'flex flex-col'
            )}
          >
            <div className="p-4 md:p-6 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground tracking-wider">ZOE DATA FEED</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">SENTINEL PROTOCOL v1.0</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {feedItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-3 rounded-xl bg-card/40 border border-border/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{item.label}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_hsl(var(--accent))]" />
                  </div>
                  <p className="text-sm text-foreground font-mono mt-1">{item.value}</p>
                </motion.div>
              ))}

              <div className="mt-2 p-3 rounded-xl border border-border/50 bg-card/40">
                <p className="text-[10px] text-muted-foreground font-mono mb-2 tracking-wider">ZOE PROTOCOL LOGS</p>
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-mono">AWAITING STREAM EVENTS</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((entry, idx) => (
                      <p key={`${entry}-${idx}`} className="text-xs text-foreground/90 font-mono leading-relaxed">
                        {entry}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 p-3 rounded-xl border border-border/50 bg-card/40">
                <p className="text-[10px] text-muted-foreground font-mono mb-2 tracking-wider">INTELLIGENCE EVENTS</p>
                {events.length === 0 ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
                    <Activity className="w-4 h-4" />
                    AWAITING MANUAL QUERY
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((item, idx) => (
                      <div key={`${item.lat}-${item.lng}-${idx}`} className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                        <p className="text-xs text-foreground font-mono">{item.event}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border/40">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                SENTINEL ONLINE
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Floating Command Bar with Voice (Step 3) ────────────────────────────────
const CommandBar: React.FC<{
  isProcessing: boolean;
  onSubmitCommand: (value: string) => Promise<void>;
}> = ({ isProcessing, onSubmitCommand }) => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  const submitCommand = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    console.log('[Sentinel] Command submitted:', trimmed);
    await onSubmitCommand(trimmed);
    setInput('');
    transcriptRef.current = '';
  }, [onSubmitCommand]);

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: 'Voice unavailable',
        description: 'This browser does not support SpeechRecognition.',
      });
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      transcriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(' ')
        .trim();
      transcriptRef.current = transcript;
      setInput(transcript);
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e?.error === 'not-allowed') {
        toast({
          title: 'Microphone permission blocked',
          description: 'Please allow microphone access and try again.',
          variant: 'destructive',
        });
      } else {
        console.error('[Sentinel] Speech error:', e?.error);
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      if (transcriptRef.current.trim()) {
        await submitCommand(transcriptRef.current);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, submitCommand, toast]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCommand(input);
  }, [input, submitCommand]);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 25 }}
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-40',
        'w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-2xl',
        'bg-card/45 backdrop-blur-xl',
        'border border-border/50',
        'rounded-2xl px-3 py-2',
        'shadow-xl'
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleVoice}
          className={cn(
            'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
            isListening
              ? 'bg-accent/20 text-accent shadow-[0_0_20px_hsl(var(--accent)/0.35)] animate-pulse'
              : 'text-muted-foreground hover:text-accent hover:bg-card/70'
          )}
          aria-label="Toggle voice command"
        >
          <Mic className="w-4 h-4" />
        </button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Type or speak a Zoe command...'}
          disabled={isProcessing}
          className={cn(
            'flex-1 bg-transparent border-0 text-foreground placeholder:text-muted-foreground',
            'text-sm font-mono focus-visible:ring-0 focus-visible:ring-offset-0'
          )}
        />
      </form>
    </motion.div>
  );
};

// ── Main Sentinel Page ───────────────────────────────────────────────────────
const SentinelContent: React.FC = () => {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));
  const [isProcessing, setIsProcessing] = useState(false);
  const [intelligencePoints, setIntelligencePoints] = useState<GlobePoint[]>([]);
  const [flightPoints, setFlightPoints] = useState<GlobePoint[]>([]);
  const [feedLogs, setFeedLogs] = useState<string[]>([]);

  const appendFeedLog = useCallback((message: string) => {
    setFeedLogs((prev) => {
      if (prev[prev.length - 1] === message) return prev;
      return [...prev.slice(-9), message];
    });
  }, []);

  const containsForbiddenKeys = useCallback((value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    const blocked = new Set(['name', 'address', 'ssn']);

    if (Array.isArray(value)) {
      return value.some(containsForbiddenKeys);
    }

    return Object.entries(value as Record<string, unknown>).some(([key, nestedValue]) =>
      blocked.has(key.toLowerCase()) || containsForbiddenKeys(nestedValue)
    );
  }, []);

  const validateIntelligencePayload = useCallback((raw: unknown): GlobePoint[] | null => {
    try {
      const normalized = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw));

      if (containsForbiddenKeys(normalized)) {
        return null;
      }

      const coordinates = (normalized as any)?.coordinates;
      if (!Array.isArray(coordinates)) {
        return null;
      }

      const validPoints = coordinates
        .filter((item: any) =>
          typeof item?.lat === 'number' && Number.isFinite(item.lat) &&
          typeof item?.lng === 'number' && Number.isFinite(item.lng)
        )
        .map((item: any) => ({
          id: item.id ?? `intel-${Math.random().toString(36).slice(2, 8)}`,
          lat: item.lat,
          lng: item.lng,
          event: typeof item?.event === 'string' ? item.event : 'Unknown event',
          ...(typeof item?.altitude === 'number' && Number.isFinite(item.altitude) ? { altitude: item.altitude } : {}),
          ...(typeof item?.radius === 'number' && Number.isFinite(item.radius) ? { radius: item.radius } : {}),
          ...(typeof item?.color === 'string' ? { color: item.color } : {}),
          ...(item?.source === 'flight' || item?.source === 'intelligence' ? { source: item.source } : {}),
        }));

      return validPoints.length > 0 ? validPoints : null;
    } catch {
      return null;
    }
  }, [containsForbiddenKeys]);


  const processZoeIntelligence = useCallback(async (prompt: string) => {
    setIsProcessing(true);
    try {
      console.log('[Sentinel] processZoeIntelligence prompt:', prompt);
      appendFeedLog(`> QUERY RECEIVED: ${prompt.slice(0, 80)}`);
      appendFeedLog('> ZOE PROTOCOL: Intelligence pipeline awaiting live source connection.');
    } finally {
      setIsProcessing(false);
    }
  }, [appendFeedLog]);

  // ── Clickable flight handler ────────────────────────────────────────────────
  const handleFlightClick = useCallback((flight: GlobePoint) => {
    const event = flight.event || 'Unknown';
    setIntelligencePoints((prev) => {
      const newPoint: GlobePoint = {
        id: `clicked-${Date.now()}`,
        lat: flight.lat,
        lng: flight.lng,
        event,
        color: '#FFCC00',
        source: 'intelligence',
      };
      return [newPoint, ...prev].slice(0, 20);
    });
    appendFeedLog(`> TARGET ACQUIRED: ${event}`);
  }, [appendFeedLog]);

  // ── Sky Layer: fetch REAL OpenSky data every 60s ──────────────────────────
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchFlights = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const openSkyUrl = 'https://opensky-network.org/api/states/all?lamin=20.0&lomin=-130.0&lamax=60.0&lomax=20.0';
        
        const sources = [
          // Primary: edge function proxy
          { url: `${supabaseUrl}/functions/v1/opensky-proxy`, headers: { 'Authorization': `Bearer ${supabaseKey}` }, unwrap: false },
          // Fallback: allorigins /get
          { url: `https://api.allorigins.win/get?url=${encodeURIComponent(openSkyUrl)}`, headers: {}, unwrap: true },
        ];

        let data: any = null;
        for (const src of sources) {
          try {
            const res = await fetch(src.url, { headers: src.headers, signal: AbortSignal.timeout(20000) });
            if (!res.ok) continue;
            const raw = await res.json();
            data = src.unwrap && typeof raw?.contents === 'string' ? JSON.parse(raw.contents) : raw;
            if (data?.states) break;
            data = null;
          } catch {
            continue;
          }
        }

        if (!data || !data.states) throw new Error('Invalid OpenSky format - all sources failed');
        if (isCancelled) return;

        const states: any[] = data.states;
        const filtered = states.filter((s: any) => s[6] != null && s[5] != null);
        const capped = filtered.slice(0, 250);

        const points: GlobePoint[] = capped
          .map((s: any, i: number) => ({
            id: `osky-${s[0] ?? i}`,
            lat: s[6] as number,
            lng: s[5] as number,
            event: `Target: ${(s[1] ?? 'N/A').trim() || 'N/A'} | Origin: ${s[2] ?? 'Unknown'} | Speed: ${s[9] != null ? Math.round(s[9]) : '?'} m/s`,
            color: '#FFCC00',
            source: 'flight' as const,
            heading: typeof s[10] === 'number' ? s[10] : 0,
          }));

        if (!isCancelled) {
          setFlightPoints(points);
          if (feedLogs.length === 0 || !feedLogs.includes(SKY_SIM_LOG)) {
            appendFeedLog(SKY_SIM_LOG);
          }
          console.log(`[Sentinel] OpenSky: ${points.length} flights loaded`);
        }
      } catch (err) {
        console.error('Zoe Fetch Error:', err);
        if (!isCancelled) {
          appendFeedLog('> ZOE WARNING: OpenSky fetch failed. Retrying in 60s...');
        }
      }

      // Schedule next fetch
      if (!isCancelled) {
        timeoutId = setTimeout(fetchFlights, 60000);
      }
    };

    fetchFlights();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const globePoints = useMemo(() => [...flightPoints, ...intelligencePoints], [flightPoints, intelligencePoints]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/50" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(hsl(var(--foreground)/0.08)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.08)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-4 md:px-6 h-14 border-b border-border/30 bg-background/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Satellite className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-[0.2em] uppercase">M'mora Sentinel</h1>
            <p className="text-[9px] text-muted-foreground font-mono tracking-wider">SATELLITE INTELLIGENCE</p>
          </div>
        </div>
        <span className="text-[10px] text-accent font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          ONLINE
        </span>
      </header>

      <ZoeDataFeed
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        events={intelligencePoints}
        logs={feedLogs}
        flightCount={flightPoints.length}
      />

      <main
        className={cn(
          'absolute top-14 bottom-24 right-0 z-10 transition-all duration-300',
          sidebarOpen ? 'left-72 md:left-80' : 'left-0'
        )}
      >
        <ZoeSatelliteGlobe className="w-full h-full" points={globePoints} onFlightClick={handleFlightClick} />
      </main>

      <CommandBar isProcessing={isProcessing} onSubmitCommand={processZoeIntelligence} />
    </div>
  );
};

const SentinelPage: React.FC = () => (
  <SentinelErrorBoundary>
    <SentinelContent />
  </SentinelErrorBoundary>
);

export default SentinelPage;
