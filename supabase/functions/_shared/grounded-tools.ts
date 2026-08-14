// ═══════════════════════════════════════════════════════════════════════════
// GROUNDED TOOLS — Function Calling + Hidden Scratchpad for Zoe
//
// Two independent safety nets so Zoe never hallucinates arithmetic/logic:
//   1. TOOL LOOP  — the model pauses, asks for `math_calculator`, we execute
//                   deterministically in code, feed the fact back, it resumes.
//   2. PRE-COMPUTE— even if the provider has no tool support (Groq fallback,
//                   OpenRouter free tier), we detect expressions in the prompt
//                   and inject GROUNDED FACTS into the system prompt.
//
// Plus `stripScratchpad()` so the model can think inside <scratchpad>…</scratchpad>
// without ever leaking that to the user.
//
// No `eval`. No `Function()`. Pure tokenizer + shunting-yard evaluator.
// Deno-safe and vitest-importable (no top-level Deno access).
// ═══════════════════════════════════════════════════════════════════════════

const env = (k: string): string | undefined =>
  (globalThis as any)?.Deno?.env?.get?.(k) ?? undefined;

// ───────────────────────── Safe math evaluator ─────────────────────────

type Tok = { t: 'num' | 'op' | 'lp' | 'rp' | 'fn'; v: string };

const FUNCS: Record<string, (n: number) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor,
  ceil: Math.ceil, ln: Math.log, log: Math.log10, sin: Math.sin,
  cos: Math.cos, tan: Math.tan,
};

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };

function tokenize(src: string): Tok[] {
  const s = src
    .replace(/[×✕x]\s*(?=[\d(])/gi, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
    .replace(/\bplus\b/gi, '+')
    .replace(/\bminus\b/gi, '-')
    .replace(/\btimes\b/gi, '*')
    .replace(/\bdivided by\b/gi, '/')
    .replace(/\bpi\b/gi, String(Math.PI));
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const num = s.slice(i, j);
      if ((num.match(/\./g) || []).length > 1) throw new Error(`Malformed number "${num}"`);
      out.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (/[a-z]/i.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/i.test(s[j])) j++;
      const name = s.slice(i, j).toLowerCase();
      if (!FUNCS[name]) throw new Error(`Unknown function "${name}"`);
      out.push({ t: 'fn', v: name });
      i = j;
      continue;
    }
    if (c === '(') { out.push({ t: 'lp', v: c }); i++; continue; }
    if (c === ')') { out.push({ t: 'rp', v: c }); i++; continue; }
    if (PREC[c] !== undefined) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Unsupported character "${c}"`);
  }
  return out;
}

/** Deterministic arithmetic. Throws on anything it cannot prove. */
export function evaluateMath(expression: string): number {
  const raw = (expression ?? '').trim();
  if (!raw) throw new Error('Empty expression');
  if (raw.length > 400) throw new Error('Expression too long');

  const toks = tokenize(raw.replace(/^[^0-9(.\-+a-z]*/i, '').replace(/[=?.\s]+$/, ''));
  if (!toks.length) throw new Error('No expression found');

  // Shunting-yard → RPN, with unary +/- normalization.
  const outQ: Tok[] = [];
  const ops: Tok[] = [];
  let prev: Tok | null = null;
  for (const tk of toks) {
    if (tk.t === 'num') { outQ.push(tk); prev = tk; continue; }
    if (tk.t === 'fn') { ops.push(tk); prev = tk; continue; }
    if (tk.t === 'lp') { ops.push(tk); prev = tk; continue; }
    if (tk.t === 'rp') {
      while (ops.length && ops[ops.length - 1].t !== 'lp') outQ.push(ops.pop()!);
      if (!ops.length) throw new Error('Unbalanced parentheses');
      ops.pop();
      if (ops.length && ops[ops.length - 1].t === 'fn') outQ.push(ops.pop()!);
      prev = tk;
      continue;
    }
    // operator
    const unary = (tk.v === '-' || tk.v === '+') && (!prev || prev.t === 'op' || prev.t === 'lp');
    if (unary) { outQ.push({ t: 'num', v: '0' }); }
    while (
      ops.length &&
      ops[ops.length - 1].t === 'op' &&
      (PREC[ops[ops.length - 1].v] > PREC[tk.v] ||
        (PREC[ops[ops.length - 1].v] === PREC[tk.v] && tk.v !== '^'))
    ) outQ.push(ops.pop()!);
    ops.push(tk);
    prev = tk;
  }
  while (ops.length) {
    const o = ops.pop()!;
    if (o.t === 'lp') throw new Error('Unbalanced parentheses');
    outQ.push(o);
  }

  const st: number[] = [];
  for (const tk of outQ) {
    if (tk.t === 'num') { st.push(parseFloat(tk.v)); continue; }
    if (tk.t === 'fn') {
      const a = st.pop();
      if (a === undefined) throw new Error('Malformed expression');
      st.push(FUNCS[tk.v](a));
      continue;
    }
    const b = st.pop(); const a = st.pop();
    if (a === undefined || b === undefined) throw new Error('Malformed expression');
    switch (tk.v) {
      case '+': st.push(a + b); break;
      case '-': st.push(a - b); break;
      case '*': st.push(a * b); break;
      case '/':
        if (b === 0) throw new Error('Division by zero');
        st.push(a / b); break;
      case '%':
        if (b === 0) throw new Error('Modulo by zero');
        st.push(a % b); break;
      case '^': st.push(Math.pow(a, b)); break;
      default: throw new Error(`Unsupported operator "${tk.v}"`);
    }
  }
  if (st.length !== 1 || !Number.isFinite(st[0])) throw new Error('Malformed expression');
  return st[0];
}

/** Rounds float noise (0.1+0.2 → 0.3) without losing precision. */
export function formatNumber(n: number): string {
  const r = Math.round(n * 1e10) / 1e10;
  return Number.isInteger(r) ? String(r) : String(parseFloat(r.toPrecision(12)));
}

// ───────────────────────── Tool registry ─────────────────────────

export type ToolExecution = { tool: string; args: Record<string, unknown>; result: Record<string, unknown> };

export const GROUNDED_TOOL_DEFS = [
  {
    name: 'math_calculator',
    description:
      'Evaluate an arithmetic expression deterministically. ALWAYS use this for ANY arithmetic instead of computing mentally.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'e.g. "17 * 249 * (1 - 0.125)"' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'character_counter',
    description:
      'Count the exact number of times a specific letter, character, or substring appears in a word or phrase. ALWAYS use this tool for spelling, counting letters, or analyzing character occurrences.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The word or phrase to analyze, e.g. "strawberry"' },
        target_char: { type: 'string', description: 'The letter or character to count, e.g. "r"' },
      },
      required: ['text', 'target_char'],
    },
  },
  {
    name: 'logic_checker',
    description:
      'Verify a numeric claim before asserting it. Give the claimed value and the expression it should equal; returns whether the claim is factually true.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'The expression that should produce the value' },
        claimed_value: { type: 'number', description: 'The value you were about to state' },
      },
      required: ['expression', 'claimed_value'],
    },
  },
  {
    name: 'sequence_simulator',
    description:
      'Simulate a step-by-step state change puzzle (riddles: object moved between containers, river crossings, swaps). Provide the ordered steps as plain sentences; returns the tracked final state so you never guess.',
    parameters: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered steps, e.g. ["coin placed in mug", "mug turned upside down on table", "mug moved to microwave"]',
        },
        question: { type: 'string', description: 'What is being asked, e.g. "where is the coin?"' },
      },
      required: ['steps'],
    },
  },
] as const;

/** Executes a tool locally. Never throws — errors come back as data the model can read. */
export function executeGroundedTool(name: string, args: Record<string, any>): Record<string, unknown> {
  try {
    if (name === 'math_calculator') {
      const value = evaluateMath(String(args?.expression ?? ''));
      return { ok: true, expression: args?.expression, value, display: formatNumber(value) };
    }
    if (name === 'character_counter') {
      const text = String(args?.text ?? '');
      const target = String(args?.target_char ?? '');
      if (!text) throw new Error('No text provided');
      if (!target) throw new Error('No target character provided');
      const regex = new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);
      const count = matches ? matches.length : 0;
      const positions = [...text.matchAll(regex)].map((m) => (m.index ?? 0) + 1);
      return {
        ok: true,
        text,
        target_char: target,
        count,
        positions,
        instruction: `FACT: The character '${target}' appears EXACTLY ${count} time(s) in "${text}" (positions ${positions.join(', ') || 'none'}). State this exact number. Do not guess.`,
      };
    }
    if (name === 'sequence_simulator') {
      const steps: string[] = Array.isArray(args?.steps) ? args.steps.map((s: unknown) => String(s)) : [];
      if (!steps.length) throw new Error('No steps provided');
      const trace = steps.map((s, i) => `${i + 1}. ${s.trim()}`);
      return {
        ok: true,
        steps: trace,
        question: args?.question ?? null,
        instruction:
          'Walk the numbered steps in order, updating the location/state of EVERY object after each step. ' +
          'Objects only move when a step explicitly moves them — a container moving does not move its contents if the contents already fell out. ' +
          'State the final answer from this trace, not from memory of similar riddles.',
      };
    }
    if (name === 'logic_checker') {
      const value = evaluateMath(String(args?.expression ?? ''));
      const claimed = Number(args?.claimed_value);
      const matches = Math.abs(value - claimed) < 1e-9;
      return {
        ok: true,
        expression: args?.expression,
        actual_value: value,
        claimed_value: claimed,
        claim_is_true: matches,
        instruction: matches ? 'Claim verified — state it.' : `Claim is WRONG. Correct value is ${formatNumber(value)}. Use that.`,
      };
    }
    return { ok: false, error: `Unknown tool "${name}"` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), instruction: 'Do not guess. Say you could not compute it.' };
  }
}

/** Detects "how many X in Y" style questions and grounds them before the model speaks. */
export function precomputeCharacterFacts(text: string): ToolExecution[] {
  const out: ToolExecution[] = [];
  const re = /how\s+many\s+(?:letter\s+)?["'`]?([a-z])["'`]?(?:'s|s)?\s+(?:are\s+|is\s+)?(?:there\s+)?in\s+(?:the\s+word\s+)?["'`]?([a-z][a-z\- ]{1,40}?)["'`]?\s*[?.!]?$/gim;
  for (const m of String(text ?? '').matchAll(re)) {
    const target = m[1];
    const word = m[2].trim();
    const result = executeGroundedTool('character_counter', { text: word, target_char: target });
    if (result.ok) out.push({ tool: 'character_counter', args: { text: word, target_char: target }, result });
  }
  return out;
}

// ───────────────── Pre-compute net (provider-agnostic) ─────────────────

const EXPR_RE = /(?<![\w.])((?:\d+(?:\.\d+)?)(?:\s*[-+*/^%×÷]\s*(?:\(*\s*\d+(?:\.\d+)?\s*\)*))+)(?![\w.])/g;

/**
 * Finds arithmetic in the user's text and solves it deterministically so the
 * facts are already in context even when the provider cannot call tools.
 */
export function precomputeGroundedFacts(text: string): ToolExecution[] {
  const out: ToolExecution[] = [];
  const seen = new Set<string>();
  for (const m of String(text ?? '').matchAll(EXPR_RE)) {
    const expr = m[1].trim();
    if (seen.has(expr) || out.length >= 6) continue;
    seen.add(expr);
    if (!/[-+*/^%×÷]/.test(expr)) continue;
    const result = executeGroundedTool('math_calculator', { expression: expr });
    if (result.ok) out.push({ tool: 'math_calculator', args: { expression: expr }, result });
  }
  return out;
}

export function groundedFactsBlock(facts: ToolExecution[]): string {
  if (!facts.length) return '';
  const lines = facts.map((f) => {
    const a = f.args as any;
    const r = f.result as any;
    if (f.tool === 'character_counter') {
      return `- the letter '${a.target_char}' appears exactly ${r.count} time(s) in "${a.text}"`;
    }
    return `- ${a.expression} = ${r.display}`;
  });
  return `\n\n## GROUNDED FACTS (computed deterministically — these are TRUE, never contradict them)\n${lines.join('\n')}\n`;
}

import { applyCircuitBreaker } from './loop-breaker.ts';

// ───────────────────────── Hidden scratchpad ─────────────────────────

export const SCRATCHPAD_INSTRUCTION = `
## HIDDEN SCRATCHPAD PROTOCOL (mandatory for tricky questions)
Before your final answer, think step-by-step inside <scratchpad>…</scratchpad>:
1. Track objects, state changes, units, and arithmetic. For ANY arithmetic, call the
   math_calculator tool instead of computing in your head.
2. For ANY letter/spelling/character counting question, call character_counter — never count in your head.
3. For riddles with objects moving between places or ordered steps, call sequence_simulator and follow its trace.
4. FOR NEGATIVE CONSTRAINTS (e.g. "do not use the letter X", "avoid the word Y", "without mentioning Z"):
   you MUST first brainstorm a list of 10 highly relevant alternative words that strictly obey the rule
   inside the scratchpad, then re-check each one against the constraint. You are strictly forbidden from
   writing your final answer until this safe vocabulary list is generated.
5. Never repeat a sentence or question you already used earlier in this conversation — if you notice
   yourself circling, pick a new angle and move the conversation forward.
The user NEVER sees the scratchpad, so be blunt and correct yourself freely inside it.
After </scratchpad>, write the final conversational answer using ONLY your validated logic and safe vocabulary.`;

/** Removes scratchpad/thinking blocks so they never reach the user. */
export function stripScratchpad(text: string): string {
  if (!text) return '';
  let out = text
    .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Unclosed scratchpad (truncated generation): drop everything after the tag.
  const open = out.search(/<(scratchpad|thinking|think)>/i);
  if (open !== -1) out = out.slice(0, open);
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/** Returns the hidden reasoning (for the debug/CoT panel only). */
export function extractScratchpad(text: string): string[] {
  return [...String(text ?? '').matchAll(/<(?:scratchpad|thinking|think)>([\s\S]*?)<\/(?:scratchpad|thinking|think)>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

// ───────────────────────── Tool-calling loop ─────────────────────────

export interface ToolLoopResult {
  ok: boolean;
  content: string;
  provider: string;
  model: string;
  toolExecutions: ToolExecution[];
  rounds: number;
  error?: string;
}

type Msg = { role: string; content: string };

const MAX_ROUNDS = 3;

/**
 * Gemini function calling with a real tool-response loop.
 * Round 1: model may emit functionCall parts → we execute → send functionResponse
 * → model resumes, grounded in the true values.
 */
export async function runGeminiToolLoop(
  systemPrompt: string,
  messages: Msg[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number; model?: string } = {},
): Promise<ToolLoopResult> {
  const apiKey = env('GOOGLE_AI_STUDIO_KEY');
  const model = opts.model ?? 'gemini-2.0-flash';
  const base: ToolLoopResult = { ok: false, content: '', provider: 'gemini', model, toolExecutions: [], rounds: 0 };
  if (!apiKey) return { ...base, error: 'GOOGLE_AI_STUDIO_KEY not set' };

  messages = applyCircuitBreaker(messages);
  const contents: any[] = messages
    .filter((m) => m.role !== 'system' && m.content)
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const toolExecutions: ToolExecution[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const body = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: [{ functionDeclarations: GROUNDED_TOOL_DEFS }],
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.6,
      },
    };

    let data: any;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal },
      );
      clearTimeout(timer);
      if (!resp.ok) {
        const t = await resp.text();
        return { ...base, toolExecutions, rounds: round, error: `${resp.status}: ${t.slice(0, 180)}` };
      }
      data = await resp.json();
    } catch (e) {
      return { ...base, toolExecutions, rounds: round, error: e instanceof Error ? e.message : String(e) };
    }

    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((p) => p?.functionCall?.name);

    if (!calls.length) {
      const text = parts.map((p) => p?.text ?? '').join('').trim();
      if (!text) return { ...base, toolExecutions, rounds: round + 1, error: 'empty_response' };
      return { ok: true, content: text, provider: 'gemini', model, toolExecutions, rounds: round + 1 };
    }

    // The pause → execute locally → hand the fact back.
    contents.push({ role: 'model', parts: calls.map((c) => ({ functionCall: c.functionCall })) });
    const responseParts = calls.map((c) => {
      const name = c.functionCall.name as string;
      const args = (c.functionCall.args ?? {}) as Record<string, any>;
      const result = executeGroundedTool(name, args);
      toolExecutions.push({ tool: name, args, result });
      console.log(`[grounded-tools] ${name}(${JSON.stringify(args)}) → ${JSON.stringify(result)}`);
      return { functionResponse: { name, response: result } };
    });
    contents.push({ role: 'user', parts: responseParts });
  }

  return { ...base, toolExecutions, rounds: MAX_ROUNDS, error: 'max_tool_rounds_exceeded' };
}

/**
 * OpenAI-style tool loop (Groq / OpenRouter). Second grounded provider so a
 * Gemini quota 429 does NOT drop Zoe back to guessing arithmetic.
 */
export async function runOpenAIToolLoop(
  systemPrompt: string,
  messages: Msg[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<ToolLoopResult> {
  const groqKey = env('GROQ_API_KEY');
  const orKey = env('OPENROUTER_API_KEY');
  const provider = groqKey ? 'groq' : orKey ? 'openrouter' : null;
  const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct';
  const url = provider === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
  const base: ToolLoopResult = { ok: false, content: '', provider: provider ?? 'none', model, toolExecutions: [], rounds: 0 };
  if (!provider) return { ...base, error: 'no tool-capable key (GROQ_API_KEY / OPENROUTER_API_KEY)' };

  messages = applyCircuitBreaker(messages);
  const convo: any[] = [
    { role: 'system', content: systemPrompt },
    ...messages.filter((m) => m.role !== 'system' && m.content).map((m) => ({ role: m.role, content: m.content })),
  ];
  const tools = GROUNDED_TOOL_DEFS.map((t) => ({ type: 'function', function: t }));
  const toolExecutions: ToolExecution[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let data: any;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey ?? orKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: convo,
          tools,
          tool_choice: 'auto',
          max_tokens: opts.maxTokens ?? 2048,
          temperature: opts.temperature ?? 0.6,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) {
        const t = await resp.text();
        return { ...base, toolExecutions, rounds: round, error: `${resp.status}: ${t.slice(0, 180)}` };
      }
      data = await resp.json();
    } catch (e) {
      return { ...base, toolExecutions, rounds: round, error: e instanceof Error ? e.message : String(e) };
    }

    const msg = data?.choices?.[0]?.message;
    const calls = msg?.tool_calls ?? [];
    if (!calls.length) {
      const text = (msg?.content ?? '').trim();
      if (!text) return { ...base, toolExecutions, rounds: round + 1, error: 'empty_response' };
      return { ok: true, content: text, provider: provider!, model, toolExecutions, rounds: round + 1 };
    }

    convo.push(msg);
    for (const c of calls) {
      const name = c?.function?.name as string;
      let args: Record<string, any> = {};
      try { args = JSON.parse(c?.function?.arguments ?? '{}'); } catch { args = {}; }
      const result = executeGroundedTool(name, args);
      toolExecutions.push({ tool: name, args, result });
      console.log(`[grounded-tools:${provider}] ${name}(${JSON.stringify(args)}) → ${JSON.stringify(result)}`);
      convo.push({ role: 'tool', tool_call_id: c.id, name, content: JSON.stringify(result) });
    }
  }

  return { ...base, toolExecutions, rounds: MAX_ROUNDS, error: 'max_tool_rounds_exceeded' };
}
