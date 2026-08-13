/**
 * TencentDB Agent Memory Gateway client (MemoryCore).
 *
 * Routes verified against github.com/TencentCloud/TencentDB-Agent-Memory
 * (MemoryCore/src/gateway/server.ts and v2-router.ts):
 *   GET  /health              health probe (only unauthenticated route)
 *   POST /capture             L0 ingest of a user+assistant round
 *   POST /recall              cross-tier context prefetch for injection
 *   POST /search/memories     L1 atomic memories
 *   POST /search/conversations L0 raw conversations
 *   POST /session/end         flush the session so L1-L3 distillation runs
 *   POST /v2/core/read|write  L3 persona
 *
 * Local run (build the image yourself — no official published image):
 *   git clone https://github.com/TencentCloud/TencentDB-Agent-Memory
 *   cd TencentDB-Agent-Memory/MemoryCore && docker build -t memory-core:local .
 *   docker run -p 8420:8420 -e TDAI_GATEWAY_HOST=0.0.0.0 ... memory-core:local
 *
 * The gateway does NOT send CORS headers by default: set
 * `server.corsOrigins` in tdai-gateway.yaml or the browser will block calls.
 */

const STORAGE_KEY = 'mmora.memoryGateway.baseUrl';
const API_KEY_STORAGE_KEY = 'mmora.memoryGateway.apiKey';
const SERVICE_ID_STORAGE_KEY = 'mmora.memoryGateway.serviceId';

export const DEFAULT_GATEWAY_URL = 'http://localhost:8420';

export interface MemoryResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** true when the gateway answered 401/403 (reachable, but auth is wrong). */
  unauthorized?: boolean;
}

export interface MemoryAtom {
  id?: string;
  content: string;
  type?: string;
  score?: number;
  created_at?: string;
}

export interface PersonaPayload {
  persona?: string;
  summary?: string;
  content?: string;
  traits?: string[];
  updated_at?: string;
  [key: string]: unknown;
}

export interface RecallPayload {
  context?: string;
  strategy?: string;
  memory_count?: number;
  code?: string;
  message?: string;
  retryable?: boolean;
}

export interface CapturePayload {
  l0_recorded?: boolean;
  scheduler_notified?: boolean;
}

export interface SearchPayload {
  results?: MemoryAtom[];
  total?: number;
  strategy?: string;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const readSetting = (key: string, fallback = ''): string => {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const writeSetting = (key: string, value: string): void => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
};

export const getGatewayUrl = (): string =>
  readSetting(STORAGE_KEY, DEFAULT_GATEWAY_URL);

export const setGatewayUrl = (url: string): void =>
  writeSetting(STORAGE_KEY, url.replace(/\/+$/, ''));

export const getGatewayApiKey = (): string => readSetting(API_KEY_STORAGE_KEY);
export const setGatewayApiKey = (key: string): void =>
  writeSetting(API_KEY_STORAGE_KEY, key.trim());

export const getGatewayServiceId = (): string =>
  readSetting(SERVICE_ID_STORAGE_KEY);
export const setGatewayServiceId = (id: string): void =>
  writeSetting(SERVICE_ID_STORAGE_KEY, id.trim());

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

const TIMEOUT_MS = 15000;

async function request<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean }
): Promise<MemoryResponse<T>> {
  const base = getGatewayUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const authHeaders: Record<string, string> = {};
  if (!init?.skipAuth) {
    const apiKey = getGatewayApiKey();
    const serviceId = getGatewayServiceId();
    if (apiKey) authHeaders.Authorization = `Bearer ${apiKey}`;
    if (serviceId) authHeaders['x-tdai-service-id'] = serviceId;
  }

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      const unauthorized = response.status === 401 || response.status === 403;
      return {
        success: false,
        unauthorized,
        error: unauthorized
          ? 'Gateway rejected the credentials — set the API key and service id in Settings.'
          : `Gateway responded ${response.status} ${response.statusText}`,
      };
    }

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (typeof json === 'object' && json !== null && 'success' in json) {
      return json as MemoryResponse<T>;
    }
    return { success: true, data: json as T };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      success: false,
      error: aborted
        ? `Gateway timed out at ${base}`
        : `Cannot reach the gateway at ${base} — is the container running, and is CORS allow-listed for this origin?`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

export const MemoryService = {
  /** Health probe. The only route that never requires auth. */
  async ping(): Promise<MemoryResponse> {
    return request('/health', { method: 'GET', skipAuth: true });
  },

  /**
   * L0 ingest. The gateway takes a full user+assistant round, not one role
   * at a time, and asynchronously distills it into L1/L2/L3.
   */
  async captureRound(
    sessionKey: string,
    userContent: string,
    assistantContent: string,
    userId?: string
  ): Promise<MemoryResponse<CapturePayload>> {
    return request<CapturePayload>('/capture', {
      method: 'POST',
      body: JSON.stringify({
        session_key: sessionKey,
        session_id: sessionKey,
        user_id: userId,
        user_content: userContent,
        assistant_content: assistantContent,
      }),
    });
  },

  /** Purpose-built cross-tier context prefetch — the primary grounding call. */
  async recall(
    query: string,
    sessionKey: string,
    userId?: string
  ): Promise<MemoryResponse<RecallPayload>> {
    return request<RecallPayload>('/recall', {
      method: 'POST',
      body: JSON.stringify({ query, session_key: sessionKey, user_id: userId }),
    });
  },

  /** L1 atomic memories (extracted facts). */
  async searchMemories(
    query: string,
    limit = 10
  ): Promise<MemoryResponse<SearchPayload | MemoryAtom[]>> {
    return request('/search/memories', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  },

  /** L0 raw conversation search. */
  async searchConversations(
    query: string,
    sessionKey?: string,
    limit = 10
  ): Promise<MemoryResponse<SearchPayload | MemoryAtom[]>> {
    return request('/search/conversations', {
      method: 'POST',
      body: JSON.stringify({ query, limit, session_key: sessionKey }),
    });
  },

  /** L3 persona lives behind the data-plane core store. */
  async getPersona(): Promise<MemoryResponse<PersonaPayload>> {
    return request<PersonaPayload>('/v2/core/read', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /** Flush the session so L1/L2/L3 aggregation runs for what was captured. */
  async endSession(
    sessionKey: string,
    userId?: string
  ): Promise<MemoryResponse<{ flushed?: boolean }>> {
    return request('/session/end', {
      method: 'POST',
      body: JSON.stringify({ session_key: sessionKey, user_id: userId }),
    });
  },
};

/** Normalises the shapes the gateway returns for atom lists ({ results, total, strategy }). */
export const normaliseAtoms = (payload: unknown): MemoryAtom[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as MemoryAtom[];
  const obj = payload as Record<string, unknown>;
  for (const key of ['results', 'memories', 'atoms', 'items', 'data']) {
    const value = obj[key];
    if (Array.isArray(value)) {
      return (value as Record<string, unknown>[]).map((raw) => ({
        id: (raw.id ?? raw.memory_id) as string | undefined,
        content: String(raw.content ?? raw.text ?? raw.summary ?? ''),
        type: (raw.type ?? raw.category) as string | undefined,
        score: typeof raw.score === 'number' ? raw.score : undefined,
        created_at: (raw.created_at ?? raw.createdAt) as string | undefined,
      }));
    }
  }
  return [];
};

/** Pulls readable persona text out of the /v2/core/read payload. */
export const extractPersonaText = (payload: PersonaPayload | null): string => {
  if (!payload) return '';
  const direct =
    payload.persona ?? payload.summary ?? payload.content ?? undefined;
  if (typeof direct === 'string' && direct.trim()) return direct;

  const nested = (payload as Record<string, unknown>).data;
  if (typeof nested === 'string' && nested.trim()) return nested;
  if (nested && typeof nested === 'object') {
    const n = nested as PersonaPayload;
    const inner = n.persona ?? n.summary ?? n.content;
    if (typeof inner === 'string' && inner.trim()) return inner;
  }

  if (Array.isArray(payload.traits) && payload.traits.length) {
    return payload.traits.join('\n');
  }
  const keys = Object.keys(payload);
  return keys.length ? JSON.stringify(payload, null, 2) : '';
};
