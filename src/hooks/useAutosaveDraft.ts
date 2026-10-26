/**
 * Wires a form to local-first draft autosave (see src/lib/draftAutosave.ts).
 *
 * Restores the saved draft once when the surface opens, then debounce-saves
 * every change. Call the returned `clearDraft` after a successful publish.
 */
import { useEffect, useRef, useState } from 'react';
import { clearDraft as clearStoredDraft, hasDraftContent, loadDraft, saveDraft } from '@/lib/draftAutosave';

const SAVE_DEBOUNCE_MS = 600;

interface UseAutosaveDraftOptions {
  /** Stable per-surface key, e.g. 'home-post'. */
  surface: string;
  values: Record<string, string>;
  files: File[];
  /** Save/restore only while the surface is open. */
  enabled: boolean;
  onRestore: (draft: { values: Record<string, string>; files: File[] }) => void;
}

export function useAutosaveDraft({ surface, values, files, enabled, onRestore }: UseAutosaveDraftOptions) {
  const [restored, setRestored] = useState(false);
  const loadedRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  useEffect(() => {
    if (!enabled) {
      loadedRef.current = false;
      return;
    }
    let cancelled = false;
    void loadDraft(surface).then((draft) => {
      if (cancelled) return;
      loadedRef.current = true;
      if (draft && hasDraftContent(draft.values, draft.files)) {
        onRestoreRef.current({ values: draft.values, files: draft.files });
        setRestored(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [surface, enabled]);

  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    if (!enabled || !loadedRef.current) return;
    const timer = setTimeout(() => {
      void saveDraft(surface, values, files);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, enabled, valuesKey, files]);

  const clearDraft = () => {
    setRestored(false);
    void clearStoredDraft(surface);
  };

  return { restored, clearDraft };
}
