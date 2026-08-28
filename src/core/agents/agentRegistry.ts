// ═══════════════════════════════════════════════════════════════════════════════
// PLUG-IN AGENT REGISTRY
// Agents declare themselves with a manifest and a dynamic import. Nothing is
// evaluated until an agent is actually requested, and each agent gets its own
// isolated sandbox object — no agent can read or mutate another's state.
// ═══════════════════════════════════════════════════════════════════════════════

import { reportPlatformError } from '@/lib/enterpriseTelemetry';
import { usePlatformStore } from '@/store/usePlatformStore';

export interface AgentSandbox {
  readonly agentId: string;
  /** Per-agent key/value scratch space. Never shared across agents. */
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  clear(): void;
}

export interface AgentModule {
  /** Optional lifecycle hooks the loaded module may expose. */
  activate?: (sandbox: AgentSandbox) => void | Promise<void>;
  deactivate?: (sandbox: AgentSandbox) => void | Promise<void>;
  default?: unknown;
  [key: string]: unknown;
}

export interface AgentManifest {
  id: string;
  label: string;
  /** Dynamic import — the whole point: the chunk is fetched on demand only. */
  load: () => Promise<AgentModule>;
  /** Mounts WebGL / heavy compute; used for thermal budgeting. */
  heavy?: boolean;
  /** Routes where this agent is allowed to activate. */
  routes?: string[];
  capabilities?: string[];
}

interface LoadedAgent {
  manifest: AgentManifest;
  module: AgentModule;
  sandbox: AgentSandbox;
}

const manifests = new Map<string, AgentManifest>();
const loaded = new Map<string, LoadedAgent>();
const inflight = new Map<string, Promise<LoadedAgent | null>>();

function createSandbox(agentId: string): AgentSandbox {
  const store = new Map<string, unknown>();
  return Object.freeze({
    agentId,
    get: <T,>(key: string) => store.get(key) as T | undefined,
    set: <T,>(key: string, value: T) => {
      store.set(key, value);
    },
    clear: () => store.clear(),
  });
}

/** Register (or replace) an agent plug-in. Idempotent by id. */
export function registerAgent(manifest: AgentManifest): () => void {
  manifests.set(manifest.id, manifest);
  return () => {
    void unloadAgent(manifest.id);
    manifests.delete(manifest.id);
  };
}

export function registerAgents(list: AgentManifest[]) {
  list.forEach(registerAgent);
}

export const listAgents = (): AgentManifest[] => Array.from(manifests.values());

export const getManifest = (agentId: string): AgentManifest | undefined => manifests.get(agentId);

export const isLoaded = (agentId: string): boolean => loaded.has(agentId);

export function isAgentAllowedOnRoute(agentId: string, route: string): boolean {
  const manifest = manifests.get(agentId);
  if (!manifest) return false;
  if (!manifest.routes?.length) return true;
  return manifest.routes.some((r) => route.startsWith(r));
}

/**
 * Lazy-load an agent chunk once. Concurrent callers share one in-flight import,
 * failures are reported and degrade to `null` instead of throwing into render.
 */
export async function loadAgent(agentId: string): Promise<LoadedAgent | null> {
  const existing = loaded.get(agentId);
  if (existing) return existing;
  const pending = inflight.get(agentId);
  if (pending) return pending;

  const manifest = manifests.get(agentId);
  if (!manifest) {
    reportPlatformError({
      errorType: 'AgentRegistryUnknownAgent',
      message: `No agent registered with id "${agentId}"`,
      severity: 'medium',
      source: 'agent-registry',
    });
    return null;
  }

  const task = (async () => {
    try {
      const module = await manifest.load();
      const sandbox = createSandbox(agentId);
      const entry: LoadedAgent = { manifest, module, sandbox };
      loaded.set(agentId, entry);
      await module.activate?.(sandbox);
      usePlatformStore.getState().clearAgentDegraded(agentId);
      return entry;
    } catch (e) {
      const message = String((e as Error)?.message ?? e);
      usePlatformStore.getState().markAgentDegraded(agentId, message);
      reportPlatformError({
        errorType: 'AgentLoadFailure',
        message: `${agentId}: ${message}`,
        stack: (e as Error)?.stack,
        severity: 'high',
        source: `agent:${agentId}`,
      });
      return null;
    } finally {
      inflight.delete(agentId);
    }
  })();

  inflight.set(agentId, task);
  return task;
}

/** Activate an agent for a route, enforcing route scope and thermal limits. */
export async function activateAgent(
  agentId: string,
  route = typeof window !== 'undefined' ? window.location.pathname : '/',
): Promise<boolean> {
  if (!isAgentAllowedOnRoute(agentId, route)) return false;

  const manifest = manifests.get(agentId);
  const store = usePlatformStore.getState();
  if (manifest?.heavy && store.thermalSafeMode) return false;

  const entry = await loadAgent(agentId);
  if (!entry) return false;
  usePlatformStore.getState().setActiveAgent(agentId);
  return true;
}

/** Tear an agent down and drop its sandbox so no state leaks into the next load. */
export async function unloadAgent(agentId: string): Promise<void> {
  const entry = loaded.get(agentId);
  if (!entry) return;
  try {
    await entry.module.deactivate?.(entry.sandbox);
  } catch (e) {
    console.warn('[agent-registry] deactivate failed:', agentId, e);
  }
  entry.sandbox.clear();
  loaded.delete(agentId);
  const store = usePlatformStore.getState();
  if (store.activeAgent === agentId) store.setActiveAgent(null);
}

/** Test helper — wipes the registry between cases. */
export function __resetAgentRegistry() {
  manifests.clear();
  loaded.clear();
  inflight.clear();
}
