/** Demo explorer walker switch: set platform-wide by the admin (realmapAdminSettings), cached on this device. */
import { useSyncExternalStore } from 'react';
const KEY = 'vr-demo-explorer';
let on = (() => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } })();
const ls = new Set<() => void>();
export const demoExplorerOn = () => on;
export function setDemoExplorer(v: boolean) { on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private */ } ls.forEach((l) => l()); }
export const useDemoExplorerOn = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => on, () => on);
