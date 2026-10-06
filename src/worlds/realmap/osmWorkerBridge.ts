/** Sends map answers to the background worker; falls back to the main thread if workers are unavailable. */
import { parseOverpass, type OsmChunk } from './osmParse';

let w: Worker | null | undefined;
let seq = 0;
const waiting = new Map<number, { ok: (c: OsmChunk) => void; fail: (e: Error) => void }>();
export const workerStats = { inWorker: 0, onMain: 0 };

function worker(): Worker | null {
  if (w !== undefined) return w;
  try {
    w = new Worker(new URL('./osmParse.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; chunk?: OsmChunk; error?: string }>) => {
      const p = waiting.get(e.data.id); if (!p) return; waiting.delete(e.data.id);
      if (e.data.chunk) p.ok(e.data.chunk); else p.fail(new Error(e.data.error || 'parse failed'));
    };
    w.onerror = () => { w = null; waiting.forEach((p) => p.fail(new Error('worker failed'))); waiting.clear(); };
  } catch { w = null; }
  return w;
}

export function parseInWorker(text: string, cap: number): Promise<OsmChunk> {
  const wk = typeof Worker !== 'undefined' ? worker() : null;
  if (!wk) { workerStats.onMain++; return Promise.resolve(parseOverpass(JSON.parse(text), cap)); }
  const id = ++seq;
  return new Promise<OsmChunk>((ok, fail) => { waiting.set(id, { ok, fail }); wk.postMessage({ id, text, cap }); })
    .then((c) => { workerStats.inWorker++; return c; })
    .catch(() => { workerStats.onMain++; return parseOverpass(JSON.parse(text), cap); });
}
