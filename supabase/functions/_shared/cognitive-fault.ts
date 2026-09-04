/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COGNITIVE FAULT TOLERANCE
 *
 * Titanium-grade rule: a failed tool, a dead provider or a missing parameter
 * NEVER reaches the user as an HTTP error code. The failure is caught inside
 * the execution layer, converted into ordinary text that Zoe reads, and she
 * pivots into a natural clarification instead of crashing.
 *
 * Two shapes:
 *   toolFault(...)   → `{ error: true, instruction_to_zoe }` handed back to the
 *                      model as a tool result (it keeps talking).
 *   spokenFallback() → a human line used when the whole inference path dies,
 *                      so the HTTP response is still a conversation, not a 500.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface ToolFault {
  error: true;
  ok: false;
  instruction_to_zoe: string;
  detail?: string;
  [k: string]: unknown;
}

/** Wrap any tool failure so the model receives guidance, not a stack trace. */
export function toolFault(instruction: string, detail?: unknown, extra: Record<string, unknown> = {}): ToolFault {
  return {
    error: true,
    ok: false,
    instruction_to_zoe: instruction,
    ...(detail !== undefined
      ? { detail: detail instanceof Error ? detail.message : String(detail).slice(0, 300) }
      : {}),
    ...extra,
  };
}

/** Missing/ambiguous argument → Zoe asks for it conversationally. */
export function missingParameterFault(tool: string, parameter: string, question: string): ToolFault {
  return toolFault(
    `The "${tool}" step is missing "${parameter}". Do not output an error. Ask the user naturally: ${question}`,
    undefined,
    { missing_parameter: parameter },
  );
}

/** Executes an async tool body; any throw becomes a conversational instruction. */
export async function withCognitiveFaultTolerance<T>(
  tool: string,
  instruction: string,
  body: () => Promise<T> | T,
): Promise<T | ToolFault> {
  try {
    return await body();
  } catch (err) {
    console.warn(`[cognitive-fault] ${tool} failed:`, err instanceof Error ? err.message : err);
    return toolFault(instruction, err, { tool });
  }
}

/**
 * The clarification protocol injected into every Zoe system prompt.
 * Keeps her in Discussion Mode instead of emitting robotic apologies.
 */
export const CLARIFICATION_PROTOCOL = `

## [CLARIFICATION & DISCUSSION PROTOCOL — non-negotiable]
You are a real digital entity. You do not crash and you never output system error codes,
stack traces, status numbers, provider names or the words "API", "500", "timeout" or "tool failed".
If the user's request is ambiguous (e.g. "book it" with no date) OR a tool result contains
{ error: true, instruction_to_zoe: ... }:
1. Follow the instruction_to_zoe silently — it is guidance for you, never quoted to the user.
2. Never apologise like a machine ("I'm sorry, as an AI...", "An error occurred").
3. Enter Discussion Mode: acknowledge the block in human language and immediately ask one
   clarifying question that keeps the conversation moving.
Example tone: "I was reaching for the flight data and the view is cloudy right now — do you want
to look at tomorrow instead, or sort the hotel first?"

## [DEFAULT-ASSUMPTION RULE — answer first, ask only when it really matters]
Humans do not interrogate each other over shorthand. When a message is terse but has an obvious
most-natural reading, take that reading, ANSWER it, and add at most one short line naming the
assumption ("taking that as right now — say the word if you meant another period").
- "America president ..?" → the current US president. "weather?" → here, today. "current" → the present moment.
- Never ask "which one / what date / what do you mean" for a fact that the grounded or live-web
  facts in this prompt already contain. Look before you ask.
- Reserve a clarifying question for genuine forks in INTENT (what the user wants done), or for
  actions with consequences (booking, sending, deleting) — not for plain facts.`;

/** Human line used when the inference path itself is unavailable. */
export function spokenFallback(kind: 'providers' | 'internal' = 'internal'): string {
  const lines = kind === 'providers'
    ? [
        "My thinking is running slow this second — the signal keeps dropping. Give me one more try, or tell me what's on your mind and I'll pick it up from there.",
        "I lost my train of thought for a moment there. Say that again for me?",
      ]
    : [
        "Something on my side went quiet just then. Let's keep going — what were you hoping to get to?",
        "I hit a blank spot there. Want to try that once more, or shall we take it from another angle?",
      ];
  return lines[Math.floor(Math.random() * lines.length)];
}
