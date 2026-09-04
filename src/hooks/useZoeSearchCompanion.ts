/**
 * useZoeSearchCompanion — realtime conversational layer for the search bar.
 *
 * Preferences (voice on/off + remembered scope per topic) are cached in
 * localStorage for instant, zero-latency reads and mirrored to
 * `zoe_search_prefs` so they follow the user across devices. Nothing in the
 * typing path awaits the network.
 */
import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildCompanionTurn,
  type CompanionTurn,
  type SearchScope,
  type SearchTopic,
} from '@/lib/zoeSearchCompanion';
import { speakSearchLine, stopSearchVoice } from '@/lib/zoeSearchVoice';

const STORAGE_KEY = 'mmora.zoe.search-companion.v1';

interface CompanionPrefs {
  voiceEnabled: boolean;
  /** Remembered scope per topic — set when the user picks "and remember". */
  scopeByTopic: Partial<Record<SearchTopic, SearchScope>>;
}

const DEFAULT_PREFS: CompanionPrefs = { voiceEnabled: false, scopeByTopic: {} };

function readLocal(): CompanionPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<CompanionPrefs>;
    return {
      voiceEnabled: !!parsed.voiceEnabled,
      scopeByTopic: parsed.scopeByTopic && typeof parsed.scopeByTopic === 'object' ? parsed.scopeByTopic : {},
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writeLocal(prefs: CompanionPrefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / quota — the in-memory state still works this session */
  }
}

export function useZoeSearchCompanion(query: string, open: boolean) {
  const [prefs, setPrefs] = React.useState<CompanionPrefs>(readLocal);
  /** Scope chosen for the current query (not necessarily remembered). */
  const [scope, setScope] = React.useState<SearchScope | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  // Hydrate from the backend once; local cache wins until it arrives.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user || cancelled) return;
      const { data, error } = await supabase
        .from('zoe_search_prefs')
        .select('voice_enabled, scope_by_topic')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const next: CompanionPrefs = {
        voiceEnabled: !!data.voice_enabled,
        scopeByTopic: (data.scope_by_topic as CompanionPrefs['scopeByTopic']) ?? {},
      };
      setPrefs(next);
      writeLocal(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = React.useCallback((next: CompanionPrefs) => {
    setPrefs(next);
    writeLocal(next);
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;
        await supabase.from('zoe_search_prefs').upsert(
          {
            user_id: auth.user.id,
            voice_enabled: next.voiceEnabled,
            scope_by_topic: next.scopeByTopic,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      } catch {
        /* preference sync is best-effort; local cache is authoritative */
      }
    })();
  }, []);

  // Debounced turn so Zoe reacts while typing without thrashing.
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 320);
    return () => window.clearTimeout(id);
  }, [query]);

  React.useEffect(() => {
    setDismissed(false);
    setScope(null);
  }, [query]);

  const turn: CompanionTurn | null = React.useMemo(() => {
    if (!open || dismissed) return null;
    const term = debounced.trim();
    if (!term) return null;
    const probe = buildCompanionTurn(term, null);
    if (!probe) return null;
    const remembered = prefs.scopeByTopic[probe.topic] ?? null;
    return buildCompanionTurn(term, remembered);
  }, [debounced, open, dismissed, prefs.scopeByTopic]);

  /** Effective scope driving retrieval: explicit pick > remembered > null (all). */
  const activeScope: SearchScope | null = scope ?? (turn?.auto ? turn.suggestedScope : null);

  // Speak the line, but only when the user turned the voice on.
  React.useEffect(() => {
    if (!turn || !prefs.voiceEnabled) return;
    speakSearchLine(turn.speech, true);
  }, [turn, prefs.voiceEnabled]);

  // Opening the search bar means the user switched features: ambient card /
  // growth narration must go quiet immediately, even when Zoe's search voice
  // is off, so two Zoe voices can never overlap.
  React.useEffect(() => {
    if (open) {
      claimVoice('search');
      return () => releaseVoice('search');
    }
    stopSearchVoice();
    releaseVoice('search');
  }, [open]);

  React.useEffect(() => () => {
    stopSearchVoice();
    releaseVoice('search');
  }, []);


  const toggleVoice = React.useCallback(() => {
    const next = { ...prefs, voiceEnabled: !prefs.voiceEnabled };
    if (!next.voiceEnabled) stopSearchVoice();
    persist(next);
  }, [prefs, persist]);

  const chooseScope = React.useCallback(
    (next: SearchScope, remember = false) => {
      setScope(next);
      stopSearchVoice();
      if (remember && turn) {
        persist({ ...prefs, scopeByTopic: { ...prefs.scopeByTopic, [turn.topic]: next } });
      }
    },
    [turn, prefs, persist],
  );

  const forgetScope = React.useCallback(() => {
    if (!turn) return;
    const nextTopics = { ...prefs.scopeByTopic };
    delete nextTopics[turn.topic];
    persist({ ...prefs, scopeByTopic: nextTopics });
    setScope(null);
  }, [turn, prefs, persist]);

  const dismiss = React.useCallback(() => {
    setDismissed(true);
    stopSearchVoice();
  }, []);

  return {
    turn,
    activeScope,
    voiceEnabled: prefs.voiceEnabled,
    toggleVoice,
    chooseScope,
    forgetScope,
    dismiss,
  };
}

export default useZoeSearchCompanion;
