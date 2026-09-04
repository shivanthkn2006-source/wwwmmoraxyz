import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bridge from '@/services/zoeMemoryBridge';
import * as engine from '@/services/zoeEngine';

/**
 * ZoeChat and the Zoe orb must persist conversation rounds through the SAME
 * memory path. Since the SEP04 brain consolidation that path is `askZoe` in
 * `@/services/zoeEngine`, which itself recalls before answering and persists
 * the round afterwards through the shared bridge. A surface that drifts to a
 * private copy (or drops the import, which previously produced TS2304 build
 * failures) silently loses memory — this test fails loudly instead.
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
    expect(typeof engine.askZoe).toBe('function');
  });

  it('the engine recalls before answering and persists the round after', () => {
    const source = read('src/services/zoeEngine.ts');
    const recallAt = source.indexOf('recallZoeMemory({');
    const invokeAt = source.indexOf('functions.invoke(');
    const rememberAt = source.indexOf('rememberZoeRound({');
    expect(recallAt).toBeGreaterThan(-1);
    expect(invokeAt).toBeGreaterThan(recallAt);
    expect(rememberAt).toBeGreaterThan(invokeAt);
    const block = source.slice(rememberAt, rememberAt + 400);
    expect(block).toContain('sessionKey');
    expect(block).toContain('userText');
    expect(block).toContain('assistantText');
  });

  for (const [name, path] of SURFACES) {
    it(`${name} answers through the shared engine or bridge`, () => {
      const source = read(path);
      const usesEngine = source.includes("from '@/services/zoeEngine'") && source.includes('askZoe({');
      const usesBridge =
        source.includes("from '@/services/zoeMemoryBridge'") &&
        source.includes('recallZoeMemory({') &&
        source.includes('rememberZoeRound({');
      expect(usesEngine || usesBridge, `${name} must use the shared Zoe engine/memory bridge`).toBe(true);
    });

    it(`${name} never calls a chat backend without the shared path`, () => {
      const source = read(path);
      const rawInvokes = (source.match(/functions\.invoke\('zoe-chat'/g) ?? []).length;
      const engineCalls = (source.match(/askZoe\(\{/g) ?? []).length;
      if (rawInvokes > 0) {
        // Any remaining raw call must sit alongside an explicit recall in the same file.
        expect(source.includes('recallZoeMemory({') || engineCalls > 0).toBe(true);
      }
    });
  }
});
