/**
 * VR World item bag + quest list. Relics spin as small CSS 3D gems so the bag
 * never opens a second 3D canvas (phones only get one GPU context).
 */
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useStory, readNote, KEYS, NOTES } from '@/lib/vrStory';
import { X } from 'lucide-react';
import { QUESTS, getVRQuestSnapshot, itemLabel, loadVRQuests, subscribeVRQuests, type Rarity } from '@/lib/vrQuests';

const RARITY_HSL: Record<Rarity, string> = {
  common: 'hsl(220 9% 65%)', uncommon: 'hsl(142 71% 45%)', rare: 'hsl(219 91% 59%)',
  epic: 'hsl(219 95% 78%)', legendary: 'hsl(43 96% 56%)',
};

const Gem: React.FC<{ rarity: Rarity }> = ({ rarity }) => (
  <div className="vr-gem" aria-hidden>
    <div className="vr-gem-core" style={{ background: RARITY_HSL[rarity] }} />
    <div className="vr-gem-core vr-gem-core-b" style={{ background: RARITY_HSL[rarity] }} />
  </div>
);

export const VRBagPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const snap = useSyncExternalStore(subscribeVRQuests, getVRQuestSnapshot, getVRQuestSnapshot);
  useEffect(() => { void loadVRQuests(); }, []);
  const { state, bag } = snap;
  const story = useStory();
  const [tab, setTab] = useState<'items' | 'keys' | 'files' | 'quests'>('items');
  const [picked, setPicked] = useState<string | null>(null);
  const sel = bag.find((b) => b.id === picked) ?? null;

  return (
    <div role="dialog" aria-label="Item bag" className="pointer-events-auto absolute left-1/2 top-20 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl surface-warm-tan p-4 text-sm text-foreground">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Bag</p>
        <button type="button" aria-label="Close bag" onClick={onClose} className="rounded-full p-1"><X className="h-4 w-4" /></button>
      </div>

      <div role="tablist" className="mb-3 grid grid-cols-4 gap-1 text-[11px]">
        {([['items', `Items ${bag.length}`], ['keys', `Keys ${story.keys.length}`], ['files', `Files ${story.notes.length}`], ['quests', 'Quests']] as const).map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-lg py-1 ${tab === id ? 'bg-background/50 font-semibold' : 'bg-background/20'}`}>{l}</button>
        ))}
      </div>
      {tab === 'keys' && (story.keys.length ? <ul className="space-y-2" aria-label="Keys">{story.keys.map((k) => <li key={k} className="rounded-xl bg-background/40 p-2 text-xs">🗝️ {KEYS[k]?.name ?? k}<span className="block text-[10px] opacity-70">Opens: {KEYS[k]?.opens.replace(/_/g, ' ')}{story.open.includes(KEYS[k]?.opens) ? ' · used' : ''}</span></li>)}</ul> : <p className="text-xs text-foreground/70">No keys yet. Look around M'Mora World.</p>)}
      {tab === 'files' && (story.notes.length ? <ul className="space-y-2" aria-label="Files">{story.notes.map((n) => <li key={n}><button type="button" onClick={() => readNote(n)} className="w-full rounded-xl bg-background/40 p-2 text-left text-xs">📜 {NOTES[n]?.title ?? n}</button></li>)}</ul> : <p className="text-xs text-foreground/70">No files read yet.</p>)}
      {tab === 'quests' && <ul className="mb-4 space-y-2" aria-label="Quests">
        {QUESTS.map((q) => {
          const p = state.progress[q.id] ?? 0; const done = !!state.done[q.id];
          return (
            <li key={q.id} data-testid={`quest-${q.id}`}>
              <div className="flex justify-between text-xs">
                <span className="font-medium">{done ? '✓ ' : ''}{q.title}</span>
                <span className="tabular-nums">{p}/{q.goal}</span>
              </div>
              <p className="text-[11px] text-foreground/70">{q.description}{q.reward ? ` · Reward ${q.reward} karma` : ''}</p>
              <div className="mt-1 h-1.5 rounded-full bg-background/80">
                <div className="vr-quest-bar h-full rounded-full" style={{ width: `${(p / q.goal) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>}

      {tab === 'items' && sel && (
        <div className="mb-3 flex flex-col items-center rounded-xl bg-background/40 p-3" data-testid="bag-closeup">
          <div className="vr-item-spin scale-150"><Gem rarity={sel.rarity} /></div>
          <p className="mt-3 text-sm font-semibold capitalize">{itemLabel(sel.type)}</p>
          <p className="text-[11px] capitalize opacity-80">{sel.rarity} · found {new Date(sel.collected_at).toLocaleDateString()}</p>
        </div>
      )}
      {tab !== 'items' ? null : bag.length === 0 ? (
        <p className="text-xs text-foreground/70">Walk up to a glowing item and tap Use to pick it up.</p>
      ) : (
        <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto" aria-label="Relics">
          {bag.slice(0, 40).map((it) => (
            <button type="button" key={it.id} onClick={() => setPicked(it.id)} aria-pressed={picked === it.id} className="flex flex-col items-center gap-1 rounded-xl bg-background/40 p-2" title={`${it.rarity} ${itemLabel(it.type)}`}>
              <Gem rarity={it.rarity} />
              <span className="line-clamp-1 text-center text-[9px] capitalize">{itemLabel(it.type)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VRBagPanel;
