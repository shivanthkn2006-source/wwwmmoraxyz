// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GOD MODE — global runtime issue collector
// Installs window.onerror + unhandledrejection listeners at app boot so the
// platform scan has historical failures to report, not just what happens
// during the scan window.
// ═══════════════════════════════════════════════════════════════════════════════

export interface RuntimeIssue {
  ts: number;
  kind: 'error' | 'unhandledrejection' | 'console';
  message: string;
  source?: string;
  stack?: string;
}

const MAX = 200;
const buffer: RuntimeIssue[] = [];
let installed = false;

function push(issue: RuntimeIssue) {
  buffer.push(issue);
  if (buffer.length > MAX) buffer.shift();
}

export function installRuntimeIssueCollector(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e: ErrorEvent) => {
    try {
      push({
        ts: Date.now(),
        kind: 'error',
        message: e.message || 'unknown error',
        source: e.filename ? `${e.filename}:${e.lineno ?? '?'}` : undefined,
        stack: e.error?.stack,
      });
    } catch { /* noop */ }
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    try {
      const reason = e.reason;
      const message = typeof reason === 'string'
        ? reason
        : reason?.message ?? String(reason);
      push({
        ts: Date.now(),
        kind: 'unhandledrejection',
        message: message || 'unhandled rejection',
        stack: reason?.stack,
      });
    } catch { /* noop */ }
  });

  // Wrap console.error to capture library-level errors that never throw.
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const message = args
        .map((a) => {
          if (a instanceof Error) return a.message;
          if (typeof a === 'string') return a;
          try { return JSON.stringify(a); } catch { return String(a); }
        })
        .join(' ')
        .slice(0, 500);
      // Skip React DOM warnings that flood the buffer
      if (!message.startsWith('Warning:')) {
        push({ ts: Date.now(), kind: 'console', message });
      }
    } catch { /* noop */ }
    origError(...args);
  };
}

export function getRuntimeIssues(): RuntimeIssue[] {
  return buffer.slice();
}

export function clearRuntimeIssues(): void {
  buffer.length = 0;
}
