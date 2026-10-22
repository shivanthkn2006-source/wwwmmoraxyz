/** Bounded support for the output shape documented at https://deepai.org/apis.
 * Other DeepAI/CDN shapes must be reviewed explicitly, not followed automatically.
 */
export function deepaiImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.origin !== 'https://api.deepai.org' || url.username || url.password || url.hash) return null;
    if (!url.pathname.startsWith('/job-view-file/') || url.pathname.length <= '/job-view-file/'.length) return null;
    return url.href;
  } catch { return null; }
}