/**
 * Hard-wire guard: verifies the build is pointed at YOUR OWN backend.
 *
 * Set MANAGED_BACKEND_REF to the ref you want to move OFF, and
 * EXPECTED_SUPABASE_REF to your own project ref (or set it in CI /
 * Cloudflare Pages build variables). With SELF_HOST=1 the build FAILS
 * instead of warning, so a deploy can never silently ship pointing at the
 * wrong database.
 */
const MANAGED_BACKEND_REF = 'qwufiqkeoyvqasimcmbd';

const url = process.env.VITE_SUPABASE_URL ?? '';
const expected = process.env.EXPECTED_SUPABASE_REF ?? '';
const strict = process.env.SELF_HOST === '1';

const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? '';

const fail = (msg) => {
  if (strict) {
    console.error(`\n[backend-target] BUILD BLOCKED: ${msg}\n`);
    process.exit(1);
  }
  console.warn(`[backend-target] WARNING: ${msg}`);
};

if (!ref) {
  fail('VITE_SUPABASE_URL is missing or not a Supabase URL.');
} else if (expected && ref !== expected) {
  fail(`build points at "${ref}" but EXPECTED_SUPABASE_REF is "${expected}".`);
} else if (ref === MANAGED_BACKEND_REF) {
  fail(
    'build still points at the managed backend. Set VITE_SUPABASE_URL / ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY in Cloudflare Pages to your own project.',
  );
} else {
  console.log(`[backend-target] OK — building against your own backend (${ref}).`);
}
