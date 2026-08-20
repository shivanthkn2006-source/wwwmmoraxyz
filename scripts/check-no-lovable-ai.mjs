#!/usr/bin/env node
/**
 * Tripwire: fails if any Lovable AI Gateway usage is reintroduced.
 *
 * This project routes 100% of AI through its own provider keys
 * (Groq / Google AI Studio / OpenRouter / Pollinations) via
 * supabase/functions/_shared/sovereign-ai.ts. No Lovable AI credits
 * may ever be consumed.
 *
 * Run: node scripts/check-no-lovable-ai.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['supabase/functions', 'src'];
const ALLOWLIST = new Set([
  'supabase/functions/_shared/sovereign-ai.ts', // the guard itself mentions the string
  'scripts/check-no-lovable-ai.mjs',
]);
const PATTERNS = [/ai\.gateway\.lovable\.dev/, /LOVABLE_API_KEY/];
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const hits = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXT.test(entry)) continue;
    const rel = relative(process.cwd(), full).split('\\').join('/');
    if (ALLOWLIST.has(rel)) continue;
    const lines = readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (PATTERNS.some((p) => p.test(line))) {
        hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 160)}`);
      }
    });
  }
}

ROOTS.forEach(walk);

if (hits.length > 0) {
  console.error('\n✗ Lovable AI Gateway usage detected (billed credits):\n');
  hits.forEach((h) => console.error('  ' + h));
  console.error(
    '\nUse sovereignFetch() from supabase/functions/_shared/sovereign-ai.ts with' +
      " 'sovereign://chat/completions' instead.\n",
  );
  process.exit(1);
}

console.log('✓ No Lovable AI Gateway usage found. All AI routes through sovereign provider keys.');
