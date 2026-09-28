/**
 * ZOE ENGINE — the single canonical conversational path.
 *
 * Consolidation (Sep 2026): ZoeChat, the orb conversation panel (typed + voice)
 * and the agent surfaces used to each build their own request body, some with
 * memory recall and some without (the orb voice path was amnesiac). They now all
 * go through `askZoe`, which guarantees, in order:
 *
 *   1. long-term recall via the shared memory bridge (`recallZoeMemory`)
 *   2. one backend invocation (`zoe-chat` by default, `zoe-agent`/`zoe-infinity-brain` opt-in)
 *   3. normalised response (text + provenance citations + evolution event)
 *   4. round persistence via `rememberZoeRound`
 *
 * Callers keep their own UI state; only the transport is shared.
 */
import { supabase } from '@/integrations/supabase/client';
import { recallZoeMemory, rememberZoeRound } from '@/services/zoeMemoryBridge';
import { parseRecallSources, type ZoeRecallSource } from '@/components/zoe/ZoeRecallCitations';
import { recordDhfLineage } from '@/services/dhfLineage';
import { classifyZoeIntent, type ZoeIntent } from '@/lib/zoeIntents';
import { getGrantedCoords } from '@/utils/sharedGeolocation';
import { stripScratchpad } from '@/utils/hiddenScratchpad';
import { maybePreferenceProbe, capturePreferenceAnswer } from '@/services/zoePreferenceProbe';

export type ZoeBackend = 'zoe-chat' | 'zoe-agent' | 'zoe-infinity-brain' | 'zoe-omega-chat';

export interface ZoeEngineMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AskZoeOptions {
  /** The user's turn (already trimmed by the caller or trimmed here). */
  text: string;
  /** Stable per-surface memory session key, e.g. `zoe-chat-<uid>`. */
  sessionKey: string;
  userId?: string;
  /** Prior turns (already normalised to user/assistant). */
  history?: ZoeEngineMessage[];
  /** Extra body fields for the backend (soulMetrics, realtimeContext, ...). */
  body?: Record<string, unknown>;
  backend?: ZoeBackend;
  /** Skip memory recall (used by diagnostics/self-test paths). */
  skipRecall?: boolean;
  /** Skip round persistence (used by shadow-mode replays). */
  skipPersist?: boolean;
}

export interface AskZoeResult {
  text: string;
  sources: ZoeRecallSource[];
  evolutionEvent: unknown | null;
  memorySource: string | null;
  intent: ZoeIntent;
  raw: any;
}

/** Local time context every backend expects, computed once. */
export function zoeTimeContext() {
  const now = new Date();
  const hours = now.getHours();
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    timeOfDay: hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening',
  };
}

export async function askZoe(options: AskZoeOptions): Promise<AskZoeResult> {
  const text = options.text.trim();
  if (!text) throw new Error('Empty prompt');

  const backend: ZoeBackend = options.backend ?? 'zoe-chat';

  // If Zoe asked a getting-to-know-you question last turn, THIS is the answer.
  // A bare "eggs" carries no pattern, so it is stored explicitly.
  void capturePreferenceAnswer(text);

  let memoryContext = '';
  let memorySource: string | null = null;
  if (!options.skipRecall) {
    try {
      const recall = await recallZoeMemory({
        query: text,
        sessionKey: options.sessionKey,
        userId: options.userId,
      });
      memoryContext = recall?.context ?? '';
      memorySource = recall?.source ?? null;
    } catch (err) {
      console.warn('[ZoeEngine] recall failed, continuing without memory:', err);
    }
  }

  // Live research (Poe): questions about current facts get web results first.
  // Shared by voice and typed chat because both go through askZoe.
  let researchContext = '';
  if (/\b(latest|today|news|current|who is|who's|what is|what's|price|score|weather|when is|when did|how much|search|look up)\b/i.test(text)) {
    try {
      const r: any = await Promise.race([
        supabase.functions.invoke('zoe-sovereign', { body: { action: 'research', query: text } }),
        new Promise((res) => window.setTimeout(() => res(null), 6000)),
      ]);
      const rows = r?.data?.results ?? [];
      if (rows.length) researchContext = rows.slice(0, 5).map((h: any) => `- ${h.title}: ${h.snippet} (${h.url})`).join('\n');
    } catch { /* research must never block a reply */ }
  }

  const messages: ZoeEngineMessage[] = [
    ...(memoryContext
      ? [{
          role: 'system' as const,
          content: `Long-term memory about this user (${memorySource ?? 'memory'}):\n${memoryContext}`,
        }]
      : []),
    ...(researchContext
      ? [{ role: 'system' as const, content: `Live web results (use them, mention the source briefly):\n${researchContext}` }]
      : []),
    ...(options.history ?? []),
    { role: 'user' as const, content: text },
  ];

  const time = zoeTimeContext();
  // One engine, four transports: each backend keeps its own field name for the
  // current turn, so the caller never has to know which brain answered.
  const backendShape: Record<string, unknown> =
    backend === 'zoe-omega-chat'
      ? { message: text }
      : backend === 'zoe-agent'
        ? { command: text, userId: options.userId }
        : {};

  // Spatial telemetry: attached once, here, so EVERY Zoe surface (chat, orb,
  // voice, agent) shares the same temporal + spatial anchor. Only a real,
  // already-granted browser fix is sent — never the geolocation fallback.
  let coords: { lat: number; lng: number } | null = null;
  try {
    // GPS must never hold up a spoken turn. A granted fix can still enrich the
    // request when it is already available within this small latency budget.
    coords = await Promise.race([
      getGrantedCoords(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 180)),
    ]);
  } catch {
    coords = null;
  }
  const callerContext = (options.body?.platformContext ?? {}) as Record<string, unknown>;
  const platformContext = {
    timeOfDay: time.timeOfDay,
    currentTime: time.localTime,
    ...(coords ? { latitude: coords.lat, longitude: coords.lng, locationSource: 'device-gps' } : {}),
    // The caller always wins: page-specific context must not be overwritten.
    ...callerContext,
  };

  const { data, error } = await supabase.functions.invoke(backend, {
    body: {
      messages,
      timezone: time.timezone,
      localTime: time.localTime,
      ...backendShape,
      ...(options.body ?? {}),
      platformContext,
    },
  });


  if (error) throw new Error(error.message || 'Zoe backend failed');

  // Second net: scratchpad tags and raw metacognition envelopes never reach a bubble or Deepgram.
  let baseReply = stripScratchpad(String(data?.message || data?.response || ''));

  // Thinking layer: Zoe privately checks her draft before it is shown or spoken.
  // Bounded wait; on timeout or failure the original draft is kept.
  if (baseReply && !options.skipRecall) {
    try {
      const r: any = await Promise.race([
        supabase.functions.invoke('zoe-sovereign', { body: { action: 'review', message: text, draft: baseReply, research: researchContext } }),
        new Promise((res) => window.setTimeout(() => res(null), 11000)),
      ]);
      const checked = r?.data?.success ? stripScratchpad(String(r.data.reply || '')) : '';
      if (checked) {
        baseReply = checked;
        if (data && typeof data === 'object') { data.message = checked; if ('response' in data) data.response = checked; data.zoeReviewed = r.data.changed ? 'revised' : 'approved'; }
      }
    } catch { /* never block a reply */ }
  }

  // GETTING TO KNOW YOU — once a conversation is actually running, Zoe adds one
  // small question about tastes, allergies or habits, and remembers the answer
  // for good. Never on the opening turn, never twice in a conversation.
  let replyText = baseReply;
  try {
    const probe = maybePreferenceProbe({
      turnIndex: options.history?.length ?? 0,
      replyText: baseReply,
    });
    if (probe) replyText = `${baseReply.trim()} ${probe}`.trim();
  } catch {
    /* a memory nicety must never break a reply */
  }
  const intent = classifyZoeIntent(text);
  const result: AskZoeResult = {
    text: replyText,
    sources: parseRecallSources(data?.omniRecallSources),
    evolutionEvent: data?.evolutionEvent ?? null,
    memorySource,
    intent: intent.intent,
    raw: data,
  };

  // Cryptographic lineage: every Zoe turn is traceable to its session, IP hash
  // and route, and unmatched intents are flagged for the audit dashboard.
  void recordDhfLineage({
    entityType: 'zoe_turn',
    entityId: options.sessionKey,
    action: `${backend}:reply`,
    content: `${text}\n---\n${replyText}`,
    intent: intent.intent,
    unhandledIntent: intent.unhandled,
    metadata: {
      backend,
      memorySource,
      citations: result.sources.length,
    },
  });

  if (replyText && !options.skipPersist) {
    void rememberZoeRound({
      userId: options.userId,
      sessionKey: options.sessionKey,
      userText: text,
      assistantText: replyText,
    });

    // Life details used to be distilled only from SPOKEN turns, so anything a
    // person typed to Zoe never reached her long-term memory. Distilling here —
    // the one path every surface goes through — makes typed and spoken
    // conversation build the same memory. Fire-and-forget by design.
    void import('@/services/zoeVoiceHistory')
      .then((m) => m.rememberLifeFacts(text))
      .catch(() => {});
  }

  return result;
}

export default askZoe;
