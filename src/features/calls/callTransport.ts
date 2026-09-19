export const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

export const MAX_ICE_RESTART_ATTEMPTS = 3;
export const ICE_RESTART_DELAYS_MS = [0, 1_500, 4_000] as const;

export interface CallNetworkDiagnostics {
  iceState: RTCIceConnectionState | 'unavailable';
  route: 'direct' | 'relay' | 'unknown';
  restartCount: number;
  lastRecovery: 'idle' | 'attempting' | 'recovered' | 'failed';
  packetLossPercent: number;
  roundTripTimeMs: number | null;
}

export const DEFAULT_CALL_NETWORK_DIAGNOSTICS: CallNetworkDiagnostics = {
  iceState: 'unavailable',
  route: 'unknown',
  restartCount: 0,
  lastRecovery: 'idle',
  packetLossPercent: 0,
  roundTripTimeMs: null,
};

/**
 * A usable ICE URL must name a scheme and a real host, e.g.
 * `turn:relay.example.com:3478`. A misconfigured value such as `://host` makes
 * the browser throw while constructing the connection, which used to kill the
 * whole call before it could ring, so every URL is validated here.
 */
const ICE_URL_PATTERN = /^(stun|stuns|turn|turns):[A-Za-z0-9._-]+(:\d{1,5})?(\?transport=(udp|tcp))?$/;

export function isUsableIceUrl(url: unknown): url is string {
  return typeof url === 'string' && ICE_URL_PATTERN.test(url.trim());
}

export function normalizeIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value)) return FALLBACK_ICE_SERVERS;
  const safe: RTCIceServer[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = (entry as RTCIceServer).urls;
    const urls = (Array.isArray(raw) ? raw : [raw]).filter(isUsableIceUrl).map((url) => url.trim());
    if (urls.length === 0) continue;
    safe.push({ ...(entry as RTCIceServer), urls });
  }
  return safe.length > 0 ? safe : FALLBACK_ICE_SERVERS;
}

export function candidateRoute(candidateType?: string | null): CallNetworkDiagnostics['route'] {
  if (candidateType === 'relay') return 'relay';
  if (candidateType === 'host' || candidateType === 'srflx' || candidateType === 'prflx') return 'direct';
  return 'unknown';
}