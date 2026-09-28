/** Zoe always-on vision preference (per device) and spoken/typed commands. */
const KEY = 'mmora_zoe_vision_off_v1';

export const isZoeVisionPreferred = (): boolean => {
  try { return localStorage.getItem(KEY) !== '1'; } catch { return true; }
};

export const setZoeVisionPreference = (on: boolean) => {
  try { on ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
};

export function parseVisionCommand(text: string): 'stop' | 'start' | null {
  const t = text.toLowerCase().replace(/[^a-z\s']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/\b(vision|camera|eyes?)\b/.test(t) || t.split(' ').length > 8) return null;
  if (/\b(stop|disable|turn off|switch off|close|pause)\b/.test(t)) return 'stop';
  if (/\b(start|enable|turn on|switch on|open|resume)\b/.test(t)) return 'start';
  return null;
}
