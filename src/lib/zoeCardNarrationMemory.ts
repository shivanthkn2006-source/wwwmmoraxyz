const PREFIX = 'mmora.zoe.cardNarration';

const safeKey = (value: string) => value.replace(/[^a-zA-Z0-9._:-]/g, '_');

export function narrationDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function hasNarratedCard(userId: string, cardId: string): boolean {
  try { return window.localStorage.getItem(`${PREFIX}.card.${safeKey(userId)}.${safeKey(cardId)}`) === '1'; }
  catch { return false; }
}

export function markNarratedCard(userId: string, cardId: string): void {
  try { window.localStorage.setItem(`${PREFIX}.card.${safeKey(userId)}.${safeKey(cardId)}`, '1'); }
  catch { /* private mode */ }
}

export function hasStartedDailyNarration(userId: string, day = narrationDayKey()): boolean {
  try { return window.localStorage.getItem(`${PREFIX}.daily.${safeKey(userId)}.${day}`) === '1'; }
  catch { return false; }
}

export function markDailyNarrationStarted(userId: string, day = narrationDayKey()): void {
  try { window.localStorage.setItem(`${PREFIX}.daily.${safeKey(userId)}.${day}`, '1'); }
  catch { /* private mode */ }
}