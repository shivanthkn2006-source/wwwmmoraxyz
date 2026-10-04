/**
 * Zoe vision preference (per device). OFF by default: the camera is only used
 * after the member turns vision on ("Zoe start your vision") or opens a camera
 * feature, so the camera light never comes on by itself.
 */
const KEY = 'mmora_zoe_vision_on_v2';

export const isZoeVisionPreferred = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export const setZoeVisionPreference = (on: boolean) => {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* ignore */ }
};

export function parseVisionCommand(text: string): 'stop' | 'start' | null {
  const t = text.toLowerCase().replace(/[^a-z\s']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/\b(vision|camera|eyes?)\b/.test(t) || t.split(' ').length > 8) return null;
  if (/\b(stop|disable|turn off|switch off|close|pause)\b/.test(t)) return 'stop';
  if (/\b(start|enable|turn on|switch on|open|resume)\b/.test(t)) return 'start';
  return null;
}
