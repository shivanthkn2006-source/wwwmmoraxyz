import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchGrowthImage, growthImageUrl, UnsafeGrowthImageUrl } from '../../supabase/functions/growth-image-validate/image-fetch';

const supported = 'https://image.pollinations.ai/prompt/quiet%20garden?width=768&height=432&seed=5';

describe('growth image destination boundary', () => {
  it.each([
    'http://127.0.0.1/image', 'https://10.0.0.1/image',
    'https://172.16.0.1/image', 'https://192.168.1.1/image',
    'http://169.254.169.254/latest/meta-data/', 'https://localhost/image',
    'https://service.internal/image', 'https://[::1]/image',
    'https://[fd00::1]/image', 'https://[::ffff:127.0.0.1]/image',
    'http://2130706433/image', 'http://0x7f000001/image',
    'https://attacker.example/image',
    'https://image.pollinations.ai.attacker.example/prompt/image',
    'https://image.pollinations.ai@attacker.example/prompt/image',
    'https://user:pass@image.pollinations.ai/prompt/image',
    'https://image.pollinations.ai:8443/prompt/image',
    'http://image.pollinations.ai/prompt/image',
    'https://image.pollinations.ai/other', 'file:///etc/passwd',
    '//image.pollinations.ai/prompt/image', '',
  ])('rejects %s before any network call', async (url) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchGrowthImage(url, fetcher)).rejects.toBeInstanceOf(UnsafeGrowthImageUrl);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserves the current caller URL and bytes', async () => {
    const response = new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    expect(growthImageUrl(supported)).toBe(supported);
    expect(await fetchGrowthImage(supported, fetcher)).toBe(response);
    expect(fetcher).toHaveBeenCalledWith(supported, expect.objectContaining({ redirect: 'manual' }));
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([1, 2, 3]);
  });

  it.each([301, 302, 303, 307, 308])('blocks redirect status %s without following its target', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {
      status, headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
    }));
    await expect(fetchGrowthImage(supported, fetcher)).rejects.toBeInstanceOf(UnsafeGrowthImageUrl);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe('manual');
  });

  it('also refuses relative and public redirects', async () => {
    for (const location of ['/prompt/other', 'https://attacker.example/image']) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {
        status: 302, headers: { Location: location },
      }));
      await expect(fetchGrowthImage(supported, fetcher)).rejects.toBeInstanceOf(UnsafeGrowthImageUrl);
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });

  it('wires rejection before provider readiness and uses only the guarded download', () => {
    const source = readFileSync('supabase/functions/growth-image-validate/index.ts', 'utf8');
    expect(source.indexOf('growthImageUrl(imageUrl)')).toBeLessThan(source.indexOf('if (!sovereignKey())'));
    expect(source).toContain('await fetchGrowthImage(safeImageUrl)');
    expect(source).not.toMatch(/await fetch\(imageUrl/);
  });
});