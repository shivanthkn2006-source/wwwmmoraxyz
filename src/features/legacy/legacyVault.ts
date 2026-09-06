/**
 * Digital Legacy Vault — private, owner-only entries a member leaves behind
 * for named recipients, optionally sealed until a date. RLS keeps every row
 * scoped to its owner; nothing here is ever surfaced in a public feed.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveAuthUid } from '@/lib/safeTelemetry';

export type LegacyMediaType = 'image' | 'video' | 'audio' | 'document';

export interface LegacyMemory {
  id: string;
  title: string;
  body: string | null;
  mediaUrl: string | null;
  mediaType: LegacyMediaType | null;
  recipients: string[];
  unlockAt: string | null;
  isSealed: boolean;
  createdAt: string;
}

export interface LegacyMemoryDraft {
  title: string;
  body?: string;
  mediaUrl?: string | null;
  mediaType?: LegacyMediaType | null;
  recipients?: string[];
  unlockAt?: string | null;
  isSealed?: boolean;
}

type Row = {
  id: string;
  title: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  recipients: string[] | null;
  unlock_at: string | null;
  is_sealed: boolean;
  created_at: string;
};

const toMemory = (r: Row): LegacyMemory => ({
  id: r.id,
  title: r.title,
  body: r.body,
  mediaUrl: r.media_url,
  mediaType: (r.media_type as LegacyMediaType | null) ?? null,
  recipients: r.recipients ?? [],
  unlockAt: r.unlock_at,
  isSealed: !!r.is_sealed,
  createdAt: r.created_at,
});

export function isUnlocked(memory: LegacyMemory, now = Date.now()): boolean {
  if (!memory.isSealed) return true;
  if (!memory.unlockAt) return false;
  return new Date(memory.unlockAt).getTime() <= now;
}

export async function listLegacyMemories(): Promise<LegacyMemory[]> {
  const uid = await resolveAuthUid();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('legacy_memories')
    .select('id, title, body, media_url, media_type, recipients, unlock_at, is_sealed, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as unknown as Row[]).map(toMemory);
}

export async function createLegacyMemory(draft: LegacyMemoryDraft): Promise<LegacyMemory | null> {
  const uid = await resolveAuthUid();
  if (!uid) throw new Error('Please sign in again — your session expired.');
  const title = draft.title.trim();
  if (!title) throw new Error('Give this memory a title.');

  const { data, error } = await supabase
    .from('legacy_memories')
    .insert({
      user_id: uid,
      title: title.slice(0, 200),
      body: draft.body?.slice(0, 20_000) ?? null,
      media_url: draft.mediaUrl ?? null,
      media_type: draft.mediaType ?? null,
      recipients: (draft.recipients ?? []).map((r) => r.trim()).filter(Boolean).slice(0, 25),
      unlock_at: draft.unlockAt ?? null,
      is_sealed: draft.isSealed ?? false,
    })
    .select('id, title, body, media_url, media_type, recipients, unlock_at, is_sealed, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data ? toMemory(data as unknown as Row) : null;
}

export async function deleteLegacyMemory(id: string): Promise<boolean> {
  const { error } = await supabase.from('legacy_memories').delete().eq('id', id);
  return !error;
}
