/**
 * Lights for every VR world (Real Map + M'Mora World), on the member's local
 * clock: building windows glow 17:54–05:54, street lamps 17:00–05:54.
 * Materials register once and a single 30 s ticker switches them.
 */
import * as THREE from 'three';

export const LIGHTS_ON_MIN = 17 * 60 + 54;
export const LIGHTS_OFF_MIN = 5 * 60 + 54;
export const STREET_ON_MIN = 17 * 60;
export const STREET_OFF_MIN = 5 * 60 + 54;

const mins = (d: Date) => d.getHours() * 60 + d.getMinutes();
export const lightsOnAt = (d: Date = new Date()) => { const m = mins(d); return m >= LIGHTS_ON_MIN || m < LIGHTS_OFF_MIN; };
export const streetLightsOnAt = (d: Date = new Date()) => { const m = mins(d); return m >= STREET_ON_MIN || m < STREET_OFF_MIN; };

export type LightSchedule = 'building' | 'street';
const check = (s: LightSchedule) => (s === 'street' ? streetLightsOnAt() : lightsOnAt());

type Entry = { intensity: number; schedule: LightSchedule };
const lit = new Map<THREE.MeshStandardMaterial, Entry>();
const toggles = new Map<THREE.Material, LightSchedule>();
const on: Record<LightSchedule, boolean> = { building: lightsOnAt(), street: streetLightsOnAt() };
let timer: ReturnType<typeof setInterval> | undefined;

function startTicker() {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(() => {
    let changed = false;
    (['building', 'street'] as const).forEach((s) => { const n = check(s); if (n !== on[s]) { on[s] = n; changed = true; } });
    if (!changed) return;
    lit.forEach((e, m) => { m.emissiveIntensity = on[e.schedule] ? e.intensity : 0; });
    toggles.forEach((s, m) => { m.visible = on[s]; });
  }, 30_000);
}

/** Make a material glow (at `intensity`) only during its schedule's hours. */
export function registerLit<M extends THREE.MeshStandardMaterial>(m: M, intensity = 1, schedule: LightSchedule = 'building'): M {
  lit.set(m, { intensity, schedule });
  m.emissiveIntensity = on[schedule] ? intensity : 0;
  m.addEventListener('dispose', () => lit.delete(m));
  startTicker();
  return m;
}

/** Show a material (e.g. a light pool on the ground) only during its schedule's hours. */
export function registerToggle<M extends THREE.Material>(m: M, schedule: LightSchedule = 'street'): M {
  toggles.set(m, schedule);
  m.visible = on[schedule];
  m.addEventListener('dispose', () => toggles.delete(m));
  startTicker();
  return m;
}

export const buildingLightsOn = () => on.building;

/** Whether a schedule's lights are on right now (starts the shared ticker). */
export function scheduleOn(s: LightSchedule): boolean { startTicker(); return on[s]; }
