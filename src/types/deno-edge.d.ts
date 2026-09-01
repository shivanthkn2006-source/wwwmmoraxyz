/**
 * Minimal `Deno` global declaration.
 *
 * Vitest suites under `src/` import shared Supabase Edge Function modules
 * (e.g. `supabase/functions/_shared/growth-content.ts`) directly so the growth
 * engine's pure logic can be tested without deploying. Those modules run on
 * Deno in production and read secrets via `Deno.env`, which the browser-facing
 * `tsconfig.app.json` has no types for. Declaring only the surface those
 * modules actually touch keeps the app typecheck green without pulling the full
 * Deno type library into the client build.
 *
 * This declaration is types-only and emits no runtime code.
 */
declare const Deno: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
};
