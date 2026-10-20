/**
 * Quick Unlock rules shared by the `quick-unlock` function and its tests.
 * Pure code only (Web Crypto), so it runs in Deno and in Vitest.
 */
export const CODE_PATTERN = /^\d{5}$/;
export const PBKDF2_ITERATIONS = 600_000;

const COMMON = new Set([
  '12321', '13579', '24680', '11223', '12312', '10000', '00001', '69696',
  '54345', '98789', '01234', '43210', '56789', '98765', '12358', '11112',
]);

/** Refuse all-same, straight runs (up or down, with wrap e.g. 78901) and common codes. */
export function isWeakCode(code: string): boolean {
  if (!CODE_PATTERN.test(code)) return true;
  if (/^(\d)\1{4}$/.test(code)) return true;
  const d = code.split('').map(Number);
  const up = d.every((v, i) => i === 0 || v === (d[i - 1] + 1) % 10);
  const down = d.every((v, i) => i === 0 || v === (d[i - 1] + 9) % 10);
  return up || down || COMMON.has(code);
}

/** Mirror of the database counter: 5 → 1 min, 10 → 15 min, 15 → erased. */
export function failureOutcome(attempts: number): { state: 'wrong' | 'locked' | 'erased'; waitMs: number } {
  if (attempts >= 15) return { state: 'erased', waitMs: 0 };
  if (attempts % 5 === 0) return { state: 'locked', waitMs: attempts >= 10 ? 15 * 60_000 : 60_000 };
  return { state: 'wrong', waitMs: 0 };
}

const toHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));

export function newSaltHex(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashCode(code: string, saltHex: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations, hash: 'SHA-256' }, key, 256,
  );
  return toHex(new Uint8Array(bits));
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
