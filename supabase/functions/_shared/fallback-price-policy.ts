/** Operator-owned prices: USD per million prompt/completion tokens, per request. */
export function readFallbackPricePolicy(get: (key: string) => string | undefined):
  { max_price: { prompt: number; completion: number; request: number } } | null {
  const values = ['OPENROUTER_MAX_PROMPT_USD_PER_MILLION', 'OPENROUTER_MAX_COMPLETION_USD_PER_MILLION', 'OPENROUTER_MAX_REQUEST_USD']
    .map(key => get(key));
  if (values.some(value => value === undefined || value.trim() === '')) return null;
  const [prompt, completion, request] = values.map(Number);
  if (![prompt, completion, request].every(value => Number.isFinite(value) && value >= 0)) return null;
  return { max_price: { prompt, completion, request } };
}