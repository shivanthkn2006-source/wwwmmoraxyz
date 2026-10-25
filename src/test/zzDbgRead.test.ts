import { describe, expect, it, vi } from 'vitest';
import { downloadCascadeImage } from '../../supabase/functions/_shared/cascade-image-download';
import { readTextBounded } from '../../supabase/functions/_shared/cascade-image-download';

describe('dbg', () => {
  it('downloadCascadeImage with closing stream', async () => {
    const res = new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(1200)); c.close(); } }), { headers: { 'content-type': 'image/jpeg' } });
    const out = await downloadCascadeImage('https://fixture.example/i', {}, 1024, 'follow', vi.fn<typeof fetch>().mockResolvedValue(res));
    console.log('dc out:', typeof out);
    expect(typeof out).not.toBe('string');
  });
  it('readTextBounded with closing stream', async () => {
    const res = new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('{"ok":true}')); c.close(); } }));
    const out = await readTextBounded(res, 1024);
    console.log('rtb out:', out);
    expect(out).toBe('{"ok":true}');
  });
});
