/** Stage 6 team play rules (original M'Mora content): two operatives pull the twin floodgate levers within a short window. */
export const TEAM_WINDOW_MS = 4000;
export const TEAM_COOLDOWN_MS = 10 * 60_000;
import { TEAM_LEVER_POS } from './villageMap';
export const LEVERS: { id: 'north' | 'south'; pos: [number, number, number] }[] = [
  { id: 'north', pos: TEAM_LEVER_POS.north },
  { id: 'south', pos: TEAM_LEVER_POS.south }, // moved off the lane to house 1
];
/** True when my pull and a teammate's pull on the OTHER lever land inside the window. */
export function teamSynced(mine: { lever: string; at: number } | null, theirs: { lever: string; at: number } | null, win = TEAM_WINDOW_MS) {
  return !!mine && !!theirs && mine.lever !== theirs.lever && Math.abs(mine.at - theirs.at) <= win;
}
