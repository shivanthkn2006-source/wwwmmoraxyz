import { describe, expect, it } from 'vitest';

describe('dbg', () => {
  it('raw reader on Response-from-stream', async () => {
    const stream = new ReadableStream<Uint8Array>((c) => {
      c.enqueue(new TextEncoder().encode('{"ok":true}'));
      c.close();
    });
    const res = new Response(stream);
    console.log('body?', !!res.body, 'ctor:', res.body?.constructor?.name);
    const reader = res.body!.getReader();
    const r1 = await Promise.race([reader.read(), new Promise((_, j) => setTimeout(() => j(new Error('hang1')), 2000))]);
    console.log('r1', r1);
    const r2 = await Promise.race([reader.read(), new Promise((_, j) => setTimeout(() => j(new Error('hang2')), 2000))]);
    console.log('r2', r2);
    expect(true).toBe(true);
  });
});
