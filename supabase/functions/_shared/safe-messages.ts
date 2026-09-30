/**
 * Chat role guard: callers may only send 'user' and 'assistant' turns.
 * Any 'system'/'developer'/'tool' turn from the browser is downgraded to a
 * plain user turn, so nobody can override Zoe's instructions through chat.
 */
export type SafeMsg = { role: 'user' | 'assistant'; content: string };

export function safeChatMessages(input: unknown, maxChars = 20000): SafeMsg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m === 'object')
    .map((m: any) => {
      const raw = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join(' ')
          : '';
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: raw.slice(0, maxChars),
      } as SafeMsg;
    })
    .filter((m) => m.content.length > 0);
}
