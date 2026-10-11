/**
 * VR World inventory in the attaché-case style: a dark gridded case where
 * herbs (1×2), coins and relics (1×1) sit in squares to save space. Tap an
 * item, then tap a square to move it (layout saved on the device). The case
 * grows as items are added, and "Bigger case" adds rows. The member's
 * avatar stands beside the case. Same panel in every VR world.
 */
import { createPortal } from 'react-dom';
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useStory, readNote, KEYS, NOTES } from '@/lib/vrStory';
import { QUESTS, getVRQuestSnapshot, itemLabel, loadVRQuests, subscribeVRQuests, type Rarity } from '@/lib/vrQuests';
import { usePickups, useHerb } from '@/lib/vrPickups';
import avatarImg from '@/assets/vr-case-avatar.png';
import avatarFemaleImg from '@/assets/vr-case-avatar-female.png';
import { COIN_FACES, splitCoins } from '@/lib/vrCoinLook';
import { useVRSelf } from '@/lib/vrSelf';
import { VRWorldList } from './VRWorldList';
import { GEAR, useGear, useEquipped, toggleEquip, gearStats, useLevel } from '@/lib/vrGear';

export const CASE_COLS = 10;
const MIN_ROWS = 6;
const LAYOUT_KEY = 'vr-case-layout';
const EXTRA_KEY = 'vr-case-extra-rows';

const RARITY_HSL: Record<Rarity, string> = {
  common: 'hsl(220 9% 65%)', uncommon: 'hsl(142 71% 45%)', rare: 'hsl(219 91% 59%)',
  epic: 'hsl(219 95% 78%)', legendary: 'hsl(43 96% 56%)',
};

type CaseItem = { id: string; w: number; h: number; name: string; kind: 'herb' | 'coin' | 'relic' | 'bag'; face?: 'gold' | 'blue' | 'yellow'; count?: number; rarity?: Rarity; detail?: string };
type Pos = { x: number; y: number };

/** First-fit packing that keeps saved spots when they still fit. */
export function packCase(items: CaseItem[], saved: Record<string, Pos>, cols: number, rows: number): Record<string, Pos> {
  const grid: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const fits = (it: CaseItem, p: Pos) => {
    if (p.x < 0 || p.y < 0 || p.x + it.w > cols || p.y + it.h > rows) return false;
    for (let y = p.y; y < p.y + it.h; y++) for (let x = p.x; x < p.x + it.w; x++) if (grid[y][x]) return false;
    return true;
  };
  const put = (it: CaseItem, p: Pos) => { for (let y = p.y; y < p.y + it.h; y++) for (let x = p.x; x < p.x + it.w; x++) grid[y][x] = it.id; };
  const out: Record<string, Pos> = {};
  const rest: CaseItem[] = [];
  for (const it of items) { const p = saved[it.id]; if (p && fits(it, p)) { put(it, p); out[it.id] = p; } else rest.push(it); }
  for (const it of rest) {
    search: for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const p = { x, y }; if (fits(it, p)) { put(it, p); out[it.id] = p; break search; } }
  }
  return out;
}

const Herb: React.FC = () => (
  <svg viewBox="0 0 40 80" className="h-full w-full" aria-hidden>
    <path d="M20 78 L20 30" stroke="hsl(95 45% 35%)" strokeWidth="2" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <g key={i} transform={`translate(20 ${66 - i * 9})`}>
        <path d={`M0 0 Q${-12 + i} -6 ${-15 + i * 1.5} -14 Q-4 -10 0 0`} fill="hsl(100 75% 52%)" />
        <path d={`M0 0 Q${12 - i} -6 ${15 - i * 1.5} -14 Q4 -10 0 0`} fill="hsl(105 70% 46%)" />
      </g>
    ))}
    <path d="M20 14 Q14 4 20 2 Q26 4 20 14" fill="hsl(100 80% 58%)" />
  </svg>
);
const Coins: React.FC = () => (
  <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
    {[0, 1, 2].map((i) => <ellipse key={i} cx="20" cy={28 - i * 5} rx="12" ry="5" fill="hsl(45 90% 52%)" stroke="hsl(38 80% 30%)" strokeWidth="1" />)}
    <ellipse cx="20" cy="18" rx="7" ry="2.5" fill="none" stroke="hsl(40 85% 35%)" strokeWidth="0.8" />
  </svg>
);
const Gem: React.FC<{ rarity: Rarity }> = ({ rarity }) => (
  <div className="vr-gem" aria-hidden>
    <div className="vr-gem-core" style={{ background: RARITY_HSL[rarity] }} />
    <div className="vr-gem-core vr-gem-core-b" style={{ background: RARITY_HSL[rarity] }} />
  </div>
);

const loadJSON = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };

type Tab = 'items' | 'keys' | 'files' | 'quests';

export const VRBagPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const snap = useSyncExternalStore(subscribeVRQuests, getVRQuestSnapshot, getVRQuestSnapshot);
  useEffect(() => { void loadVRQuests(); }, []);
  const { state, bag } = snap;
  const story = useStory();
  const pick = usePickups();
  const self = useVRSelf();
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => { const r = () => setVp({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);
  const [tab, setTab] = useState<Tab>('items');
  const gear = useGear();
  const equipped = useEquipped();
  const level = useLevel();
  const stats = gearStats(equipped, level);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, Pos>>(() => loadJSON(LAYOUT_KEY, {}));
  const [extra, setExtra] = useState<number>(() => loadJSON(EXTRA_KEY, 0));

  const items = useMemo<CaseItem[]>(() => {
    const out: CaseItem[] = [];
    for (let i = 0; i < Math.min(pick.herbs, 60); i++) out.push({ id: `herb-${i}`, w: 1, h: 2, kind: 'herb', name: 'Green Herb', detail: 'Restores stamina' });
    const c = splitCoins(pick.coins);
    if (pick.coins >= 100) out.push({ id: 'coin-bag', w: 2, h: 2, kind: 'bag', name: "M'Mora coin bag", count: pick.coins, detail: `${pick.coins} M'Mora coins in total` });
    if (c.gold) out.push({ id: 'coin-gold', w: 1, h: 1, kind: 'coin', face: 'gold', name: "Gold M'Mora coin (50)", count: c.gold, detail: 'Worth 50 each' });
    if (c.blue) out.push({ id: 'coin-blue', w: 1, h: 1, kind: 'coin', face: 'blue', name: "Blue M'Mora coin (10)", count: c.blue, detail: 'Worth 10 each' });
    if (c.yellow) out.push({ id: 'coin-yellow', w: 1, h: 1, kind: 'coin', face: 'yellow', name: "Yellow M'Mora coin (1)", count: c.yellow, detail: 'Worth 1 each' });
    for (const b of bag.filter((b) => b.type !== 'green_herb' && b.type !== 'antique_coin').slice(0, 120)) {
      out.push({ id: `relic-${b.id}`, w: 1, h: 1, kind: 'relic', rarity: b.rarity, name: itemLabel(b.type), detail: `${b.rarity} · found ${new Date(b.collected_at).toLocaleDateString()}` });
    }
    return out;
  }, [pick.herbs, pick.coins, bag]);

  const cells = items.reduce((n, it) => n + it.w * it.h, 0);
  const rows = Math.max(MIN_ROWS, Math.ceil(cells / CASE_COLS) + 2) + extra;
  // Squares shrink to keep the whole case on screen as it grows.
  const cell = Math.round(Math.max(20, Math.min(60, (vp.h - 130) / (rows + 0.6), (vp.w * 0.66 - 40) / CASE_COLS)));
  const layout = useMemo(() => packCase(items, saved, CASE_COLS, rows), [items, saved, rows]);
  const selItem = items.find((i) => i.id === sel) ?? null;
  const say = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 1800); };

  const moveItem = (it: CaseItem | null, x: number, y: number) => {
    if (!it) return;
    const others = items.filter((i) => i.id !== it.id);
    const want = { ...layout, [it.id]: { x, y } };
    const next = packCase([it, ...others], want, CASE_COLS, rows);
    if (next[it.id]?.x !== x || next[it.id]?.y !== y) { say("It doesn't fit there"); return; }
    setSaved(next); localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)); setSel(null);
  };
  const moveTo = (x: number, y: number) => moveItem(selItem, x, y);
  // Press-and-drag: the item follows the finger, then drops on the square under it.
  const gridRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ it: CaseItem; el: HTMLElement; sx: number; sy: number; moved: boolean } | null>(null);
  const onDown = (it: CaseItem) => (e: React.PointerEvent<HTMLButtonElement>) => {
    drag.current = { it, el: e.currentTarget, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true; d.el.style.transform = `translate(${dx}px, ${dy}px)`; d.el.style.zIndex = '5';
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null; if (!d) return;
    d.el.style.transform = ''; d.el.style.zIndex = '';
    if (!d.moved) { setSel((s) => (s === d.it.id ? null : d.it.id)); return; }
    const r = gridRef.current?.getBoundingClientRect(); if (!r) return;
    const x = Math.floor((e.clientX - r.left) / cell), y = Math.floor((e.clientY - r.top) / cell);
    if (x >= 0 && y >= 0 && x < CASE_COLS && y < rows) moveItem(d.it, Math.min(x, CASE_COLS - d.it.w), Math.min(y, rows - d.it.h));
  };
  const grow = () => { const n = Math.min(extra + 2, 20); setExtra(n); localStorage.setItem(EXTRA_KEY, JSON.stringify(n)); };

  const TABS: [Tab, string][] = [['keys', 'Keys\nTreasures'], ['items', 'Items'], ['files', 'Files'], ['quests', 'Quests']];

  return createPortal(
    <div role="dialog" aria-label="Item bag" className="re-case-screen pointer-events-auto fixed inset-0 flex flex-col" style={{ ['--re-cell' as string]: `${cell}px` }}>
      {/* Top menu */}
      <div className="re-case-topbar flex items-center gap-1 px-2 py-0.5 sm:gap-3 sm:px-3">
        <div role="tablist" className="flex flex-1 items-center gap-2 overflow-x-auto sm:gap-4">
          {TABS.map(([id, l]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="re-case-tab flex shrink-0 items-center gap-1.5">
              <span className="re-case-bullet" data-on={tab === id} />
              <span className="whitespace-pre text-left leading-[1.05]">{l}</span>
            </button>
          ))}
          <button type="button" aria-label="Close bag" onClick={onClose} className="re-case-tab flex shrink-0 items-center gap-1.5">
            <span className="re-case-bullet" /> Exit
          </button>
        </div>
        <div className="re-case-money shrink-0 tabular-nums">{pick.coins.toLocaleString()} <span className="text-[0.6em]">COINS</span></div>
      </div>

      {/* Case + avatar */}
      <div className="flex min-h-0 flex-1 items-center justify-center gap-3 px-3 pt-2">
        <div className="re-case-plate flex flex-col overflow-hidden" style={{ height: `${rows * cell + 56}px`,  width: tab === 'items' ? 'max-content' : `min(${CASE_COLS * cell + 40}px, 72vw)`, alignSelf: 'center' }}>
          {tab === 'items' && (
            <>
              <div className="re-case-lid" aria-hidden><span className="re-case-hinge" /><span className="re-case-hinge" /></div>
              <div className="re-case-body overflow-auto" style={{ height: `${rows * cell + 18}px` }}>
                <div ref={gridRef} className="re-case-grid" style={{ gridTemplateColumns: `repeat(${CASE_COLS}, var(--re-cell))`, gridTemplateRows: `repeat(${rows}, var(--re-cell))` }} aria-label="Relics">
                  {Array.from({ length: rows * CASE_COLS }, (_, k) => {
                    const x = k % CASE_COLS, y = Math.floor(k / CASE_COLS);
                    return <button key={`c${k}`} type="button" aria-label={`Square ${x + 1},${y + 1}`} className="re-case-cell" style={{ gridColumn: x + 1, gridRow: y + 1 }} onClick={() => moveTo(x, y)} tabIndex={selItem ? 0 : -1} />;
                  })}
                  {items.map((it) => {
                    const p = layout[it.id]; if (!p) return null;
                    return (
                      <button key={it.id} type="button" aria-pressed={sel === it.id} title={it.name} onPointerDown={onDown(it)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ touchAction: 'none', gridColumn: `${p.x + 1} / span ${it.w}`, gridRow: `${p.y + 1} / span ${it.h}` }}
                        className="re-case-item" data-kind={it.kind}>
                        <span className="re-case-art">{it.kind === 'herb' ? <Herb /> : it.kind === 'coin' ? <img src={COIN_FACES[it.face ?? 'gold']} alt="" className="h-full w-full object-contain" draggable={false} /> : it.kind === 'bag' ? <img src={COIN_FACES.bag} alt="" className="h-full w-full object-contain" draggable={false} /> : <Gem rarity={it.rarity!} />}</span>
                        {it.count !== undefined && <span className="re-case-count">{it.count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="re-case-handle" aria-hidden />
            </>
          )}
          {tab === 'keys' && <div className="re-case-list">{story.keys.length ? story.keys.map((k) => <div key={k} className="re-case-row">🗝️ {KEYS[k]?.name ?? k}<span className="block text-[10px] opacity-70">Opens: {KEYS[k]?.opens.replace(/_/g, ' ')}{story.open.includes(KEYS[k]?.opens) ? ' · used' : ''}</span></div>) : <p>No keys yet. Look around M'Mora Village.</p>}</div>}
          {tab === 'files' && <div className="re-case-list overflow-y-auto"><div className="re-case-row font-semibold">Level {level} · Attack {stats.attack} · Defence {stats.defence}</div>{(['weapon','armour','quest'] as const).map((k) => <div key={k}><div className="re-case-row font-semibold">{k === 'weapon' ? 'Weapons' : k === 'armour' ? 'Armour' : 'Quest items'}</div>{GEAR.filter((g) => g.kind === k).map((g) => <div key={g.id} className="re-case-row" style={{ opacity: gear.includes(g.id) ? 1 : 0.45 }}>{g.icon} {gear.includes(g.id) ? g.name : '???'}<span className="block text-[10px] opacity-70">{gear.includes(g.id) ? g.detail : 'Not found yet — somewhere in M\'Mora Village'}</span>{gear.includes(g.id) && g.kind !== 'quest' && <button type="button" onClick={() => toggleEquip(g.id)} className="mt-1 text-[11px] underline">{equipped.includes(g.id) ? 'Unequip' : 'Equip'}</button>}</div>)}</div>)}{story.notes.map((n) => <button key={n} type="button" onClick={() => readNote(n)} className="re-case-row w-full text-left">📜 {NOTES[n]?.title ?? n}</button>)}<VRWorldList embedded /></div>}
          {tab === 'quests' && <ul className="re-case-list" aria-label="Quests">
            {QUESTS.map((q) => { const p = state.progress[q.id] ?? 0; const done = !!state.done[q.id]; return (
              <li key={q.id} data-testid={`quest-${q.id}`} className="re-case-row">
                <div className="flex justify-between"><span>{done ? '✓ ' : ''}{q.title}</span><span className="tabular-nums">{p}/{q.goal}</span></div>
                <p className="text-[11px] opacity-70">{q.description}{q.reward ? ` · Reward ${q.reward} karma` : ''}</p>
                <div className="mt-1 h-1.5 rounded-full bg-background/30"><div className="vr-quest-bar h-full rounded-full" style={{ width: `${(p / q.goal) * 100}%` }} /></div>
              </li>); })}
          </ul>}
        </div>
        <div className="re-case-portrait flex max-w-[220px] shrink-0 flex-col items-center justify-end" style={{ width: 'min(22vw, 220px)', height: `${rows * cell + 76}px` }}>
          <img src={self.female ? avatarFemaleImg : avatarImg} alt="Your avatar" className="w-auto object-contain object-bottom" style={{ height: `${rows * cell + 40}px` }} />
          <div className="re-case-player">{self.name || 'You'}</div>
          <div className="re-case-ring"><span>{pick.herbs}</span><small>herbs</small></div>
        </div>
      </div>

      {/* Name bar + actions */}
      <div className="mx-auto flex w-full max-w-[min(100%,980px)] items-center gap-2 px-2 pb-1 pt-1">
        <div className="re-case-namebar flex-1 truncate" data-testid="bag-closeup">
          {msg ?? (selItem ? `${selItem.name}${selItem.count !== undefined ? ` ×${selItem.count}` : ''} — ${selItem.detail ?? ''}` : items.length ? 'Drag an item to a square, or tap it then tap a square' : 'Walk up to a glowing item and tap Use to pick it up.')}
        </div>
        {selItem?.kind === 'herb' && <button type="button" className="re-case-btn" onClick={() => { say(useHerb()); setSel(null); }}>Use</button>}
        {tab === 'items' && <button type="button" className="re-case-btn" onClick={grow}>Bigger case</button>}
      </div>
    </div>,
    document.body,
  );
};

export default VRBagPanel;
