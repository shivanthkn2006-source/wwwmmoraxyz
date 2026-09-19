import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('TURN endpoint source never exposes its shared secret', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assertEquals(source.includes("'Cache-Control': 'no-store'"), true);
  assertEquals(source.includes('sharedSecret,'), false);
  assertEquals(source.includes('getUser(token)'), true);
});