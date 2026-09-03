#!/usr/bin/env node
/**
 * CI GATE — every Edge Function declared with `verify_jwt = false` in
 * supabase/config.toml is reachable by anyone on the internet, so it MUST sit
 * behind the shared WAF (`publicGuard` / `guardRequest`).
 *
 * This script fails the build when a new unauthenticated function is added
 * without a guard, which is how the platform previously ended up with eight
 * wide-open surfaces.
 *
 * Run: node scripts/check-public-guard.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG = 'supabase/config.toml';
const FUNCTIONS_DIR = 'supabase/functions';

/** Functions that are pure static assets or have no HTTP handler at all. */
const EXEMPT = new Set([]);

function openFunctions() {
  const toml = readFileSync(CONFIG, 'utf8').split('\n');
  const names = [];
  let current = null;
  for (const line of toml) {
    const header = line.match(/^\s*\[functions\.([^\]]+)\]\s*$/);
    if (header) {
      current = header[1];
      continue;
    }
    if (current && /^\s*verify_jwt\s*=\s*false\s*$/.test(line)) names.push(current);
  }
  return names;
}

const missing = [];
const orphaned = [];

for (const name of openFunctions()) {
  if (EXEMPT.has(name)) continue;
  const dir = join(FUNCTIONS_DIR, name);
  if (!existsSync(dir)) {
    orphaned.push(name);
    continue;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
  const guarded = files.some((f) => {
    const src = readFileSync(join(dir, f), 'utf8');
    return src.includes('publicGuard(') || src.includes('guardRequest(');
  });
  if (!guarded) missing.push(name);
}

if (orphaned.length) {
  console.warn(
    `[check-public-guard] ${orphaned.length} config entries have no function directory (stale): ${orphaned.join(', ')}`,
  );
}

if (missing.length) {
  console.error('\n[check-public-guard] FAIL — unauthenticated functions with no WAF guard:\n');
  for (const name of missing) console.error(`  • ${name}`);
  console.error(
    "\nAdd:  import { publicGuard } from '../_shared/public-guard.ts';\n" +
      "      const guard = await publicGuard(req, { name: '<fn>', limit: 30, windowSeconds: 60 });\n" +
      '      if (guard.response) return guard.response;\n',
  );
  process.exit(1);
}

console.log(`[check-public-guard] OK — every unauthenticated edge function is guarded.`);
