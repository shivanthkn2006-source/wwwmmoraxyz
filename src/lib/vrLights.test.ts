import { test, expect } from 'vitest';
import { lightsOnAt } from './vrLights';
const at=(h:number,m:number)=>{const d=new Date();d.setHours(h,m,0,0);return d;};
test('lights',()=>{expect(lightsOnAt(at(17,53))).toBe(false);expect(lightsOnAt(at(17,54))).toBe(true);expect(lightsOnAt(at(21,59))).toBe(true);expect(lightsOnAt(at(22,0))).toBe(false);});
