import { test, expect } from 'vitest';
import { lightsOnAt, streetLightsOnAt } from './vrLights';
const at = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
test('building lights 17:54–05:54', () => { expect(lightsOnAt(at(17, 53))).toBe(false); expect(lightsOnAt(at(17, 54))).toBe(true); expect(lightsOnAt(at(22, 0))).toBe(true); expect(lightsOnAt(at(5, 53))).toBe(true); expect(lightsOnAt(at(5, 54))).toBe(false); });
test('street lamps 17:00–05:50', () => { expect(streetLightsOnAt(at(16, 59))).toBe(false); expect(streetLightsOnAt(at(17, 0))).toBe(true); expect(streetLightsOnAt(at(3, 0))).toBe(true); expect(streetLightsOnAt(at(5, 50))).toBe(false); });
