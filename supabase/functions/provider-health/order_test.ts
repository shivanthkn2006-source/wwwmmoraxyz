// Deno test: provider-health returns the cascade order T1..T5 in sequence.
// Run via: supabase functions test provider-health
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("provider-health returns 5 tiers in T1..T5 order", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/provider-health`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: "{}",
  });
  const json = await res.json();
  assertEquals(res.status, 200, `status was ${res.status}`);
  assert(Array.isArray(json.tiers), "tiers array missing");
  assertEquals(json.tiers.length, 5, "expected 5 tiers");
  json.tiers.forEach((t: any, i: number) => {
    assertEquals(t.tier, i + 1, `tier ordering broken at index ${i}`);
  });
});
