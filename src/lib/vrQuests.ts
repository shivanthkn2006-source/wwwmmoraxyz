/**
 * VR World relic quests and the item bag.
 * Every pickup goes into the member's bag; quests count matching pickups and,
 * on completion, send a "Quest complete" alert to the member's bell (and phone,
 * through the normal notification path).
 */
import { supabase } from '@/integrations/supabase/client';
import { notifySelf } from '@/lib/notifySelf';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export interface CollectedItem { type: string; rarity: Rarity }
export interface BagItem extends CollectedItem { id: string; collected_at: string }

export interface Quest {
  /** karma given once when finished (granted by the server) */
  reward?: number;
  id: string;
  title: string;
  description: string;
  goal: number;
  counts: (item: CollectedItem) => boolean;
}

export const QUESTS: Quest[] = [
  { id: 'relic_hunter', reward: 50, title: 'Relic hunter', description: 'Pick up any 3 relics', goal: 3, counts: () => true },
  { id: 'memory_keeper', reward: 75, title: 'Memory keeper', description: 'Find 2 memory shards', goal: 2, counts: (i) => i.type === 'memory_shard' },
  { id: 'rare_eye', reward: 100, title: 'Rare eye', description: 'Find a rare, epic or legendary relic', goal: 1, counts: (i) => ['rare', 'epic', 'legendary'].includes(i.rarity) },
  { id: 'treasure_seeker', reward: 100, title: 'Treasure seeker', description: 'Open a treasure chest', goal: 1, counts: (i) => i.type === 'treasure_chest' },
  { id: 'village_map', reward: 50, title: 'Lost map', description: 'Find the Old Village Map near the lanes', goal: 1, counts: (i) => i.type === 'quest_map' },
  { id: 'church_medallion', reward: 100, title: 'Altar secret', description: 'Take the Church Medallion from the altar', goal: 1, counts: (i) => i.type === 'quest_medallion' },
  { id: 'lords_crest', reward: 150, title: "The Lord's crest", description: 'Use the map and medallion to reach the castle keep and take the crest', goal: 1, counts: (i) => i.type === 'quest_crest' },
];

/** Extra in-game reward per quest: coins, a level-up, and/or the next quest it opens. */
export const QUEST_REWARDS: Record<string, { coins?: number; levelUp?: boolean; unlocks?: string }> = {
  village_map: { coins: 20, unlocks: 'church_medallion' },
  church_medallion: { coins: 50, unlocks: 'lords_crest' },
  lords_crest: { coins: 100, levelUp: true },
  relic_hunter: { coins: 10 }, memory_keeper: { coins: 15 }, rare_eye: { levelUp: true }, treasure_seeker: { coins: 25 },
};
export function rewardText(id: string) {
  const r = QUEST_REWARDS[id]; if (!r) return '';
  const nextTitle = r.unlocks ? QUESTS.find((q) => q.id === r.unlocks)?.title : '';
  return [r.coins ? `+${r.coins} coins` : '', r.levelUp ? 'Level up' : '', nextTitle ? `Opens "${nextTitle}"` : ''].filter(Boolean).join(' · ');
}
async function grantReward(id: string) {
  const r = QUEST_REWARDS[id]; if (!r) return;
  try {
    if (r.coins) (await import('@/lib/vrPickups')).addCoins(r.coins);
    if (r.levelUp) (await import('@/lib/vrGear')).levelUp();
  } catch { /* reward is best-effort; never break the game */ }
  window.dispatchEvent(new CustomEvent('vr-quest-reward-local', { detail: { id, text: rewardText(id) } }));
}

export interface QuestState { progress: Record<string, number>; done: Record<string, boolean> }

/** Pure: apply one pickup; returns the new state and quests that just finished. */
export function applyCollect(state: QuestState, item: CollectedItem): { next: QuestState; completed: Quest[] } {
  const next: QuestState = { progress: { ...state.progress }, done: { ...state.done } };
  const completed: Quest[] = [];
  for (const q of QUESTS) {
    if (next.done[q.id] || !q.counts(item)) continue;
    next.progress[q.id] = Math.min(q.goal, (next.progress[q.id] ?? 0) + 1);
    if (next.progress[q.id] >= q.goal) { next.done[q.id] = true; completed.push(q); }
  }
  return { next, completed };
}

export const itemLabel = (t: string) => t.replace(/_/g, ' ');

// ── Store (shared by the 3D world and the bag panel) ───────────────────────
let state: QuestState = { progress: {}, done: {} };
let bag: BagItem[] = [];
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
let snapshot = { state, bag };
const emit = () => { snapshot = { state, bag }; listeners.forEach((l) => l()); };

export function subscribeVRQuests(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
/** Stable between changes (required by useSyncExternalStore). */
export function getVRQuestSnapshot() { return snapshot; }

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function loadVRQuests(): Promise<void> {
  const uid = await currentUserId();
  if (!uid || loadedFor === uid) return;
  loadedFor = uid;
  const [{ data: q }, { data: b }] = await Promise.all([
    supabase.from('vr_quest_progress' as never).select('quest_id,progress,completed_at').eq('user_id', uid),
    supabase.from('vr_bag_items' as never).select('id,item_type,rarity,collected_at').eq('user_id', uid).order('collected_at', { ascending: false }).limit(200),
  ]);
  const next: QuestState = { progress: {}, done: {} };
  for (const r of (q ?? []) as Array<{ quest_id: string; progress: number; completed_at: string | null }>) {
    next.progress[r.quest_id] = r.progress; if (r.completed_at) next.done[r.quest_id] = true;
  }
  state = next;
  bag = ((b ?? []) as Array<{ id: string; item_type: string; rarity: Rarity; collected_at: string }>)
    .map((r) => ({ id: r.id, type: r.item_type, rarity: r.rarity, collected_at: r.collected_at }));
  emit();
}

/** Called on every VR pickup. Never throws — gameplay must not break on network errors. */
export async function recordVRCollect(item: CollectedItem): Promise<Quest[]> {
  const local: BagItem = { ...item, id: `local-${Date.now()}`, collected_at: new Date().toISOString() };
  bag = [local, ...bag].slice(0, 200);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vr-item-pickup', { detail: item }));
  const { next, completed } = applyCollect(state, item);
  const changed = QUESTS.filter((q) => next.progress[q.id] !== state.progress[q.id]);
  state = next;
  emit();
  for (const q of completed) {
    window.dispatchEvent(new CustomEvent('vr-quest-complete', { detail: { id: q.id, title: q.title, reward: rewardText(q.id) } }));
    void grantReward(q.id);
  }
  try {
    const uid = await currentUserId();
    if (!uid) return completed;
    await supabase.from('vr_bag_items' as never).insert({ user_id: uid, item_type: item.type, rarity: item.rarity } as never);
    if (changed.length) {
      await supabase.from('vr_quest_progress' as never).upsert(
        changed.map((q) => ({
          user_id: uid, quest_id: q.id, progress: next.progress[q.id],
          completed_at: next.done[q.id] ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
        })) as never,
        { onConflict: 'user_id,quest_id' },
      );
    }
    for (const q of completed) {
      // Reward is granted on the server, once per quest, only after the completion is saved.
      let got: unknown = 0;
      try { got = (await supabase.rpc('claim_vr_quest_reward' as never, { p_quest_id: q.id } as never)).data; } catch { /* reward retried next time; the bell still fires */ }
      const karma = typeof got === 'number' ? got : 0;
      if (karma > 0) window.dispatchEvent(new CustomEvent('vr-quest-reward', { detail: { id: q.id, karma } }));
      await notifySelf('vr_quest_complete', 'Quest complete', `${q.title}: ${q.description}${karma > 0 ? ` · +${karma} karma` : ''}`, { link: '/vr-world', quest: q.id, karma });
      void import('@/lib/vrOutbox').then((m) => m.queueVrEvent('quest_complete', { quest: q.id }));
    }
  } catch { /* offline: progress stays on screen and syncs on the next pickup */ }
  return completed;
}
