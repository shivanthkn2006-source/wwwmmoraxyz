const KEY = 'zoe-hairstyle:gallery:v1';
const CAP = 50;

export interface HairDesign {
  id: string; createdAt: number;
  cut: string; color: string; gender: string;
  prompt: string; sourceImage?: string; generatedImage: string;
}

export function loadHairDesigns(): HairDesign[] {
  try { const r = localStorage.getItem(KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; } catch { return []; }
}
export function saveHairDesign(d: HairDesign): HairDesign[] {
  const list = [d, ...loadHairDesigns()].slice(0, CAP);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  return list;
}
export function deleteHairDesign(id: string): HairDesign[] {
  const list = loadHairDesigns().filter(d => d.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  return list;
}
