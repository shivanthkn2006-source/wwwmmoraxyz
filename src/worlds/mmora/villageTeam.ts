/** Stage 6 team play rules (original M'Mora content): two operatives pull the twin floodgate levers within a short window. */
export const TEAM_WINDOW_MS = 4000;
export const TEAM_COOLDOWN_MS = 10 * 60_000;
export const LEVERS: { id: 'north' | 'south'; pos: [number, number, number] }[] = [
  { id: 'north', pos: [7, 0, -8] },
  { id: 'south', pos: [10, 0, -5] },
];
/** True when my pull and a teammate's pull on the OTHER lever land inside the window. */
export function teamSynced(mine: { lever: string; at: number } | null, theirs: { lever: string; at: number } | null, win = TEAM_WINDOW_MS) {
  return !!mine && !!theirs && mine.lever !== theirs.lever && Math.abs(mine.at - theirs.at) <= win;
}
