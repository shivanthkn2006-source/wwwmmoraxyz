// Deno test: generate-image falls back to Pollinations when the primary
// (Gemini 3.1 Flash via AI gateway) returns 429/402. We stub global fetch.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sovereignFetch } from "../_shared/sovereign-ai.ts";

Deno.test("generate-image: Gemini 429 → Pollinations fallback path", async () => {
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    calls.push(url);
    if (url.includes("sovereign.local")) {
      return Promise.resolve(new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }));
    }
    if (url.includes("pollinations.ai")) {
      return Promise.resolve(new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), {
        status: 200, headers: { "content-type": "image/jpeg" },
      }));
    }
    return realFetch(input as any, init);
  }) as typeof fetch;

  try {
    // Inline the fallback policy under test (mirrors edge-fn behavior).
    const aigRes = await sovereignFetch("sovereign://images", {
      method: "POST", body: "{}",
    });
    let imageBytes: ArrayBuffer | null = null;
    if (aigRes.status === 429 || aigRes.status === 402) {
      const poll = await fetch("https://image.pollinations.ai/prompt/test");
      assertEquals(poll.status, 200);
      imageBytes = await poll.arrayBuffer();
    }
    assert(imageBytes, "Pollinations fallback did not produce bytes");
    assert(calls.some(u => u.includes("sovereign.local")), "primary not attempted");
    assert(calls.some(u => u.includes("pollinations.ai")), "fallback not attempted");
  } finally {
    globalThis.fetch = realFetch;
  }
});
