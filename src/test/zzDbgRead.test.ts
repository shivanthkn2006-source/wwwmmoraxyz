import { describe, expect, it } from 'vitest';
import { readTextBounded } from '/dev-server/supabase/functions/_shared/cascade-image-download';

describe('dbg', () => {
  it('reads a closing stream', async () => {
    const stream = new ReadableStream<Uint8Array>((c) => {
      c.enqueue(new TextEncoder().encode('{"ok":true}'));
      c.close();
    });
    const res = new Response(stream);
    console.log('body?', !!res.body);
    const out = await readTextBounded(res, 1024);
    console.log('out:', out);
    expect(out).toBe('{"ok":true}');
  });
});
