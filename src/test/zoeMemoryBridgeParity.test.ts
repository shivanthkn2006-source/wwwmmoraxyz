import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bridge from '@/services/zoeMemoryBridge';

/**
 * ZoeChat and the Zoe orb must persist conversation rounds through the SAME
 * memory bridge. When one drifts to a private copy (or an import is dropped,
 * which previously produced TS2304 build failures) Zoe silently loses memory
 * in that surface only — this test fails loudly instead.
 */
const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), 'utf8');

const SURFACES = [
  ['ZoeChat', 'src/components/ZoeChat.tsx'],
  ['Zoe orb panel', 'src/components/ZoeOrbConversationPanel.tsx'],
] as const;

describe('Zoe memory bridge parity', () => {
  it('exposes the shared named exports', () => {
    expect(typeof bridge.recallZoeMemory).toBe('function');
    expect(typeof bridge.rememberZoeRound).toBe('function');
  });

  for (const [name, path] of SURFACES) {
    it(`${name} imports both helpers from the shared bridge`, () => {
      const source = read(path);
      const importLine = source
        .split('\n')
        .find((line) => line.includes("from '@/services/zoeMemoryBridge'"));
      expect(importLine, `${name} must import from @/services/zoeMemoryBridge`).toBeTruthy();
      expect(importLine).toContain('recallZoeMemory');
      expect(importLine).toContain('rememberZoeRound');
    });

    it(`${name} recalls before answering and persists the round after`, () => {
      const source = read(path);
      const recallAt = source.indexOf('recallZoeMemory({');
      const rememberAt = source.indexOf('rememberZoeRound({');
      expect(recallAt, `${name} must call recallZoeMemory`).toBeGreaterThan(-1);
      expect(rememberAt, `${name} must call rememberZoeRound`).toBeGreaterThan(-1);
      expect(rememberAt).toBeGreaterThan(recallAt);
    });

    it(`${name} passes a session key and both sides of the round`, () => {
      const source = read(path);
      const start = source.indexOf('rememberZoeRound({');
      const block = source.slice(start, start + 400);
      expect(block).toContain('sessionKey');
      expect(block).toContain('userText');
      expect(block).toContain('assistantText');
    });
  }
});
