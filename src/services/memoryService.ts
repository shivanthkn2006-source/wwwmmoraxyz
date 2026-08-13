/**
 * TencentDB Agent Memory Gateway client
 *
 * 4-tier pipeline: L0 Conversation -> L1 Atom -> L2 Scenario -> L3 Persona
 * Default gateway: local Docker container on port 8420
 *   docker run -p 8420:8420 tencentcloud/tencentdb-agent-memory:latest
 */

const STORAGE_KEY = 'mmora.memoryGateway.baseUrl';
export const DEFAULT_GATEWAY_URL = 'http://localhost:8420';

export interface MemoryResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
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
  traits?: string[];
  updated_at?: string;
  [key: string]: unknown;
}

export const getGatewayUrl = (): string => {
  if (typeof window === 'undefined') return DEFAULT_GATEWAY_URL;
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_GATEWAY_URL;
  } catch {
    return DEFAULT_GATEWAY_URL;
  }
};

export const setGatewayUrl = (url: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ''));
  } catch {
    /* storage unavailable */
  }
};

const TIMEOUT_MS = 8000;

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<MemoryResponse<T>> {
  const base = getGatewayUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Gateway responded ${response.status} ${response.statusText}`,
      };
    }

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    // Gateway may return either { success, data } or the raw payload
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
        : `Gateway not found at ${base} (is the container running on port 8420?)`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const MemoryService = {
  /** Health probe so the UI can show connection state before writing. */
  async ping(): Promise<MemoryResponse> {
    return request('/health', { method: 'GET' });
  },

  /**
   * Pushes raw conversation data to the L0 Tier.
   * The gateway asynchronously distills it into L1, L2 and L3.
   */
  async saveConversation(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    userId?: string
  ): Promise<MemoryResponse> {
    return request('/v1/memory/chat', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        role,
        content,
        timestamp: new Date().toISOString(),
      }),
    });
  },

  /** Retrieves the compressed L3 Persona for context bootstrapping. */
  async getPersona(userId: string): Promise<MemoryResponse<PersonaPayload>> {
    return request<PersonaPayload>(
      `/v1/memory/persona/${encodeURIComponent(userId)}`,
      { method: 'GET' }
    );
  },

  /** Retrieval of specific L1/L2 facts, budget-capped to save tokens. */
  async queryFacts(
    userId: string,
    query: string,
    limit = 5
  ): Promise<MemoryResponse<MemoryAtom[] | { results: MemoryAtom[] }>> {
    return request('/v1/memory/search', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, query, limit }),
    });
  },
};

/** Normalises the varying shapes the gateway can return for atom lists. */
export const normaliseAtoms = (payload: unknown): MemoryAtom[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as MemoryAtom[];
  const obj = payload as Record<string, unknown>;
  for (const key of ['results', 'atoms', 'items', 'data']) {
    if (Array.isArray(obj[key])) return obj[key] as MemoryAtom[];
  }
  return [];
};
