// Self-contained LocalStorage gallery for Zoe Decorator (cap 50)
import type { DecoratorSpace, DecoratorTheme } from './intent';

const KEY = 'zoe-decorator:gallery:v1';
const CAP = 50;

export interface DecoratorDesign {
  id: string;
  createdAt: number;
  space?: DecoratorSpace;
  theme?: DecoratorTheme;
  prompt: string;
  originalImage?: string; // data URL of source photo
  generatedImage: string; // data URL or remote URL
}

export function loadDesigns(): DecoratorDesign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveDesign(d: DecoratorDesign): DecoratorDesign[] {
  const list = [d, ...loadDesigns()].slice(0, CAP);
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  return list;
}

export function deleteDesign(id: string): DecoratorDesign[] {
  const list = loadDesigns().filter(d => d.id !== id);
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  return list;
}

export function clearDesigns(): void {
  try { window.localStorage.removeItem(KEY); } catch {}
}
