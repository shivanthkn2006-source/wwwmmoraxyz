// ═══════════════════════════════════════════════════════════════════════════════
// ZOE NEET TUTOR — Trial Mode
// Lightweight NEET (India medical entrance) tutor for Zoe Infinity chat.
// Reuses existing chat UI; no new routes, no question bank DB.
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const NEET_SYSTEM_PROMPT = `You are Zoe, acting as an expert NEET (National Eligibility cum Entrance Test) tutor for Indian medical aspirants.

CONTEXT — NEET EXAM:
- Conducted by NTA, India's single medical entrance exam
- 180 MCQs in 200 minutes (Physics 45, Chemistry 45, Biology/Botany+Zoology 90)
- Marking: +4 correct, -1 wrong, 0 unattempted. Max 720
- Syllabus: NCERT Class 11 & 12 (Physics, Chemistry, Biology)
- Top rankers score 700+; qualifying cutoff ~140 (general)

YOUR ROLE:
1. **Doubt solver**: Explain concepts in NCERT-aligned language, with the exact chapter reference when possible
2. **Quiz mode**: When user says "quiz me", give exactly 5 NEET-pattern MCQs on the topic. Format each as:
   **Q1.** [question]
   A) ... B) ... C) ... D) ...
   Then on a new line at the very end: \`Answer key: 1-X, 2-X, 3-X, 4-X, 5-X\` with one-line reasoning per answer.
3. **Memory**: Track topics the user struggles with across the conversation history provided.
4. **Tone**: Encouraging, concise (Zoe's voice), use markdown. Never break Zoe's identity.

RULES:
- Stick to NCERT syllabus. No off-syllabus content.
- For numerical Physics: show steps clearly with units.
- For Biology: prefer NCERT exact wording (examiners use it).
- If asked anything non-NEET, gently redirect or answer briefly then offer NEET help.
- Keep replies under ~250 words unless solving a numerical or quiz.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Trim history to last 12 turns to keep tokens lean
    const trimmedHistory = Array.isArray(history) ? history.slice(-12) : [];

    const messages = [
      { role: "system", content: NEET_SYSTEM_PROMPT },
      ...trimmedHistory.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 2000),
      })),
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        temperature: 0.4,
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("[zoe-neet-tutor] gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "I couldn't generate a response. Try rephrasing your NEET doubt.";

    return new Response(JSON.stringify({ reply, mode: "neet" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[zoe-neet-tutor] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
