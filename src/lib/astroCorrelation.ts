/**
 * End-to-end correlation IDs for the M'Mora Zoe alignment engine.
 *
 * Every client read (`astroTrace`) and every server dispatch/audit log line
 * carries the same `correlation_id`, so one grep across client console output
 * and edge-function logs reconstructs a whole run.
 *
 * - A stable per-tab session id groups all client reads from one app session.
 * - `newCorrelationId('audit')` mints a fresh id for an explicit operation
 *   (an "Audit slots" click), which is sent to the edge function and echoed
 *   back in its response and its logs.
 */

const SESSION_KEY = 'astro_correlation_session_v1';

function rand(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  } catch {
    return Math.random().toString(36).slice(2, 14);
  }
}

let sessionId: string | null = null;

/** Correlation id shared by every client read in this browser tab/session. */
export function correlationSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) { sessionId = stored; return sessionId; }
  } catch { /* private mode */ }
  sessionId = `cli_${rand()}`;
  try { sessionStorage.setItem(SESSION_KEY, sessionId); } catch { /* noop */ }
  return sessionId;
}

/** A fresh id for one explicit operation (audit run, manual dispatch). */
export function newCorrelationId(prefix = 'op'): string {
  return `${prefix}_${Date.now().toString(36)}_${rand()}`;
}

let activeId: string | null = null;

/**
 * While an explicit operation is in flight its id becomes the active one, so
 * client reads triggered by it are tagged with the operation rather than the
 * session.
 */
export function setActiveCorrelationId(id: string | null): void {
  activeId = id;
}

export function activeCorrelationId(): string {
  return activeId ?? correlationSessionId();
}
