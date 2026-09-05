import { describe, it, expect } from 'vitest';
import { classifyOrbScanIntent } from '@/features/zoe-godmode/orbScanIntent';
describe('orb scan intent', () => {
  it('routes scan phrases', () => {
    for (const s of ['security scan', 'system scan', 'run security scan', 'scan mmora', 'your brain scan', 'run a full platform audit', 'god mode scan']) expect(classifyOrbScanIntent(s), s).toBe('platform_scan');
  });
  it('routes self diagnostics', () => {
    for (const s of ["whats the error you have currently", 'what errors do you have', 'are you ok', 'system status']) expect(classifyOrbScanIntent(s), s).toBe('self_diagnostics');
  });
  it('ignores normal chat', () => {
    for (const s of ['brain', 'mmora', 'scan my face', 'what is the weather', 'ct scan results are worrying', 'hello']) expect(classifyOrbScanIntent(s), s).toBeNull();
  });
});
