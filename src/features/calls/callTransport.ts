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

export function normalizeIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value)) return FALLBACK_ICE_SERVERS;
  const safe = value.filter((entry): entry is RTCIceServer => {
    if (!entry || typeof entry !== 'object') return false;
    const urls = (entry as RTCIceServer).urls;
    return typeof urls === 'string' || (Array.isArray(urls) && urls.every((url) => typeof url === 'string'));
  });
  return safe.length > 0 ? safe : FALLBACK_ICE_SERVERS;
}

export function candidateRoute(candidateType?: string | null): CallNetworkDiagnostics['route'] {
  if (candidateType === 'relay') return 'relay';
  if (candidateType === 'host' || candidateType === 'srflx' || candidateType === 'prflx') return 'direct';
  return 'unknown';
}