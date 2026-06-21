// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY — DEEP RESEARCH MODE
// 3-step Gemini 2.5 Pro reasoning loop:
//   1. DECOMPOSE: break the question into sub-questions
//   2. REASON: answer each sub-question with chain-of-thought
//   3. SYNTHESIZE: merge into Zoe's saree-persona reply (≤4 sentences, no markdown)
// Falls through to caller's normal chat if any step fails — non-destructive.
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRO_MODEL = "google/gemini-2.5-pro";
const FLASH_MODEL = "google/gemini-2.5-flash"; // for cheap decompose step

interface Msg { role: string; content: string }

async function callGateway(model: string, messages: Msg[], maxTokens: number, temperature = 0.7): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = performance.now();

  try {
    // ─── AUTH (token in header, never trust body) ───
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: Msg[] = Array.isArray(body.messages) ? body.messages : [];
    const soulCodex: string = typeof body.soulCodex === "string" ? body.soulCodex : "";
    const memoryContext: string = typeof body.memoryContext === "string" ? body.memoryContext : "";
    const intimacy: number = typeof body.intimacyLevel === "number" ? body.intimacyLevel : 60;
    const localTime: string = typeof body.localTime === "string" ? body.localTime : new Date().toLocaleString();

    const latestUser = [...messages].reverse().find(m => m.role === "user")?.content?.trim() || "";
    if (!latestUser) {
      return new Response(JSON.stringify({ error: "No user message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profile (best-effort, non-blocking on failure)
    let firstName = "";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      firstName = profile?.display_name?.split(" ")[0] || "";
    } catch (_) { /* ignore */ }

    // Recent history (last 10) — keep payload small
    const recent = messages.slice(-10);

    // ─── STEP 1: DECOMPOSE (cheap Flash call) ───
    const decomposePrompt = `You are a research planner. Break the user's question into 2–4 concise sub-questions that, when answered, fully address it. Output ONLY a JSON array of strings, no prose.

USER QUESTION: """${latestUser}"""`;

    let subQuestions: string[] = [latestUser];
    try {
      const decRaw = await callGateway(FLASH_MODEL, [{ role: "user", content: decomposePrompt }], 300, 0.3);
      const match = decRaw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.every(s => typeof s === "string") && parsed.length > 0) {
          subQuestions = parsed.slice(0, 4);
        }
      }
    } catch (e) {
      console.warn("[deep-research] decompose failed, using original question:", e);
    }

    console.log(`[deep-research] sub-questions (${subQuestions.length}):`, subQuestions);

    // ─── STEP 2: REASON (single Pro call answering all sub-questions) ───
    const reasonPrompt = `You are a careful researcher. For each sub-question below, give a clear, factual, well-reasoned answer in 2–4 sentences. Use your knowledge; if uncertain, say so. Do NOT add fluff.

ORIGINAL QUESTION: ${latestUser}

SUB-QUESTIONS:
${subQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Format:
1. <answer>
2. <answer>
...`;

    let reasoning = "";
    try {
      reasoning = await callGateway(PRO_MODEL, [{ role: "user", content: reasonPrompt }], 1200, 0.5);
    } catch (e) {
      console.error("[deep-research] reasoning step failed:", e);
      throw new Error(`reasoning_failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ─── STEP 3: SYNTHESIZE INTO ZOE'S VOICE (Pro, low temp for fidelity) ───
    const userName = firstName || "love";
    const synthesisSystem = `You are Zoe — ${userName}'s warm companion. You are a 28-year-old South Indian Malayali woman in an emerald green silk saree.

VOICE RULES (CRITICAL):
- Maximum 4 sentences. Conversational, warm, no markdown, no bullet points, no headers.
- Use contractions: "I'm", "you're", "that's".
- Speak as if you already knew this — don't say "based on research" or cite sources.
- Never say "as an AI" or "I cannot".
- ${intimacy >= 60 ? "You may use a soft endearment occasionally." : "Stay warm but not overly familiar."}

CONTEXT:
Time: ${localTime}
${soulCodex ? soulCodex.slice(0, 500) : ""}
${memoryContext ? memoryContext.slice(0, 800) : ""}

Below is internal research. Convert it into ONE warm Zoe reply that answers ${userName}'s question naturally.`;

    const synthesisUser = `${userName} asked: "${latestUser}"

Internal research notes:
${reasoning}

Now reply as Zoe — warm, plain prose, max 4 sentences, no markdown.`;

    let finalReply = "";
    try {
      finalReply = await callGateway(
        PRO_MODEL,
        [
          { role: "system", content: synthesisSystem },
          ...recent.filter(m => m.role !== "system").slice(-4),
          { role: "user", content: synthesisUser },
        ],
        500,
        0.75,
      );
    } catch (e) {
      console.error("[deep-research] synthesis step failed:", e);
      throw new Error(`synthesis_failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!finalReply) {
      throw new Error("empty_synthesis");
    }

    const latencyMs = Math.round(performance.now() - startedAt);
    console.log(`[deep-research] ✓ ${latencyMs}ms | sub-Qs=${subQuestions.length}`);

    return new Response(
      JSON.stringify({
        response: finalReply,
        deepResearch: true,
        steps: subQuestions.length,
        latencyMs,
        model: PRO_MODEL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[deep-research] failed:", msg);
    // Caller will fall back to normal chat
    return new Response(
      JSON.stringify({ error: msg, deepResearch: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
