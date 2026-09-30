/**
 * Guards the "Cannot access 'lazy' before initialization" startup crash.
 * Vite's dev server rewrites `import { lazy } from 'react'` into a `const`
 * at the import's position, so any lazy()/memo()/createContext() call placed
 * above the React import crashes the whole app before it mounts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

describe('React import order', () => {
  it('no module calls React helpers above its React import', () => {
    const bad: string[] = [];
    for (const file of walk('src')) {
      const lines = readFileSync(file, 'utf8').split('\n');
      const imp = lines.findIndex((l) => /^import .* from ['"]react['"]/.test(l));
      if (imp < 0) continue;
      const use = lines.findIndex((l) =>
        /^\s*(export )?const \w+ = (React\.)?(lazy|memo|forwardRef|createContext)\(/.test(l),
      );
      if (use >= 0 && use < imp) bad.push(`${file}:${use + 1}`);
    }
    expect(bad).toEqual([]);
  });
});
