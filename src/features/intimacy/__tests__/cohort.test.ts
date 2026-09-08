import { describe, it, expect } from 'vitest';
import { cohortFromBirthDate, toneDirective } from '@/features/intimacy/generationalTone';
import { cohortStyle } from '@/features/intimacy/cohortStyle';
describe('cohorts', () => {
  it('maps birth years to generations', () => {
    expect(cohortFromBirthDate('2005-02-24')).toBe('genz');
    expect(cohortFromBirthDate('1982-10-24')).toBe('millennial');
    expect(cohortFromBirthDate('1977-08-16')).toBe('genx');
    expect(cohortFromBirthDate('1950-01-01')).toBe('boomer');
    expect(cohortFromBirthDate(null)).toBe('unspecified');
  });
  it('gives each generation its own tone and layout', () => {
    const tones = new Set(['genz','millennial','genx','boomer'].map((c:any)=>toneDirective(c)));
    expect(tones.size).toBe(4);
    const cols = new Set(['genz','millennial','genx','boomer'].map((c:any)=>cohortStyle(c).columnsClass));
    expect(cols.size).toBe(4);
  });
});
