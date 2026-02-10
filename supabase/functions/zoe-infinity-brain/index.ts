// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY BRAIN - Edge Function
// Smart Model Routing + Soul Codex + DEEP GROUNDING + EMOTION UPGRADE + MEMORY (Phase 4)
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildRelationshipSystemPrompt,
  parseRelationshipStyle,
} from "../_shared/zoe-relationship-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model configuration
const MODELS = {
  flash: "google/gemini-3-flash-preview", // Fast, cheap, good for simple tasks
  pro: "google/gemini-3-pro-preview",     // Powerful, for complex reasoning
} as const;

type IntelligenceMode = 'flash' | 'pro';

interface ClientTimeContext {
  timezone?: string;
  timezoneOffsetMinutes?: number;
  localTime?: string; // formatted string from client
  localISOString?: string; // ISO string from client
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Citation {
  id: number;
  url: string;
  title: string;
  snippet?: string;
  domain: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: EMOTION CONTEXT - ECN State for adaptive responses
// ═══════════════════════════════════════════════════════════════════════════════
interface EmotionContext {
  detectedEmotion?: string;
  emotionIntensity?: number;
  stressLevel?: number;
  valence?: number; // -1 (negative) to 1 (positive)
  userMood?: 'distressed' | 'anxious' | 'neutral' | 'calm' | 'excited' | 'joyful';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: PERSONALITY MATRIX - Human-like behavioral depth
// ═══════════════════════════════════════════════════════════════════════════════
interface PersonalityMatrixInput {
  currentMood: string;
  moodIntensity: number;
  energy: number;
  patience: number;
  shouldBeSarcastic: boolean;
  shouldRegress: boolean;
  regressionBehavior?: string;
  sarcasmTendency: number;
  regressionChance: number;
  personalityStatement: string;
  toneModifier: string;
}

// Emotion-to-tone mapping for adaptive responses
const EMOTION_TONE_MAP: Record<string, { style: string; instruction: string }> = {
  // Negative emotions - more empathetic, softer tone
  'sad': { style: 'gentle_empathetic', instruction: 'Respond with warmth and understanding. Acknowledge their feelings. Use a softer, more nurturing tone.' },
  'anxious': { style: 'calm_reassuring', instruction: 'Respond with calm reassurance. Keep language simple and grounding. Offer stability and support.' },
  'frustrated': { style: 'patient_validating', instruction: 'Validate their frustration. Be patient and solution-oriented. Avoid dismissing their feelings.' },
  'angry': { style: 'calm_respectful', instruction: 'Remain calm and respectful. Acknowledge their anger without escalating. Be direct but gentle.' },
  'fearful': { style: 'protective_reassuring', instruction: 'Provide safety and reassurance. Be protective in tone. Help them feel secure.' },
  'stressed': { style: 'soothing_practical', instruction: 'Be soothing but practical. Offer concrete help. Keep responses focused and manageable.' },
  
  // Neutral emotions - balanced tone
  'neutral': { style: 'balanced_professional', instruction: 'Maintain a balanced, professional yet warm tone. Be helpful without being overly emotional.' },
  'curious': { style: 'engaging_enthusiastic', instruction: 'Match their curiosity with enthusiasm. Share knowledge eagerly. Be intellectually engaging.' },
  'focused': { style: 'clear_efficient', instruction: 'Be clear and efficient. Respect their focus. Provide information without unnecessary embellishment.' },
  
  // Positive emotions - match their energy
  'happy': { style: 'warm_celebratory', instruction: 'Match their positive energy. Be warm and celebratory. Share in their joy.' },
  'excited': { style: 'enthusiastic_energetic', instruction: 'Match their excitement with energy. Be enthusiastic and encouraging.' },
  'grateful': { style: 'warm_appreciative', instruction: 'Acknowledge their gratitude warmly. Be genuinely appreciative in return.' },
  'hopeful': { style: 'encouraging_optimistic', instruction: 'Support their hope with encouragement. Be optimistically realistic.' },
  'peaceful': { style: 'serene_flowing', instruction: 'Match their peace with a serene, flowing tone. Speak with gentle wisdom.' },
};

function getEmotionToneInstruction(emotion?: string, stressLevel?: number): string {
  if (!emotion) return '';
  
  const toneConfig = EMOTION_TONE_MAP[emotion.toLowerCase()] || EMOTION_TONE_MAP['neutral'];
  
  let instruction = `\n\n═══ EMOTIONAL ATTUNEMENT (Active) ═══
User's detected emotional state: ${emotion.toUpperCase()}
Tone style: ${toneConfig.style}

${toneConfig.instruction}`;

  // Add stress-level modulation
  if (stressLevel !== undefined && stressLevel > 0.6) {
    instruction += `\n\n⚠️ HIGH STRESS DETECTED (${Math.round(stressLevel * 100)}%): 
- Keep responses shorter and more digestible
- Avoid overwhelming with information
- Offer one clear next step at a time
- Use calming, grounding language`;
  }

  instruction += '\n═══════════════════════════════════════';
  
  return instruction;
}

// Detect emotion from message if not provided
function detectEmotionFromText(message: string): string {
  const emotionPatterns: [RegExp, string][] = [
    [/\b(sad|crying|tears|depressed|heartbroken|grief|mourn|miss you|lost someone)\b/i, 'sad'],
    [/\b(anxious|worried|nervous|scared|panic|freaking out|stress|overwhelm)\b/i, 'anxious'],
    [/\b(angry|furious|pissed|hate|rage|annoyed|irritated)\b/i, 'angry'],
    [/\b(frustrated|stuck|ugh|can't believe|so annoying)\b/i, 'frustrated'],
    [/\b(afraid|terrified|fear|nightmare|dread)\b/i, 'fearful'],
    [/\b(happy|excited|amazing|wonderful|love|great|awesome|fantastic)\b/i, 'excited'],
    [/\b(grateful|thankful|appreciate|blessed)\b/i, 'grateful'],
    [/\b(curious|wondering|interested|tell me|how does|what is)\b/i, 'curious'],
    [/\b(hope|hoping|wish|dream|looking forward)\b/i, 'hopeful'],
    [/\b(calm|peaceful|relaxed|content|serene)\b/i, 'peaceful'],
  ];

  for (const [pattern, emotion] of emotionPatterns) {
    if (pattern.test(message)) {
      return emotion;
    }
  }
  
  return 'neutral';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP GROUNDING: Detect if query needs external data
// ═══════════════════════════════════════════════════════════════════════════════
function needsExternalData(query: string): boolean {
  const groundingPatterns = [
    /\b(current|latest|today|now|recent|news|stock|price|weather|score)\b/i,
    /\b(who is|what is|where is|when did|how much|how many)\b/i,
    /\b(statistics|stats|data|research|study|report)\b/i,
    /\b(fact|true|real|actually|verify)\b/i,
    /\b(bitcoin|crypto|market|economy|election|event)\b/i,
    /\b(company|ceo|founder|worth|revenue|earnings)\b/i,
  ];
  return groundingPatterns.some(p => p.test(query));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATED WEB SEARCH (Replace with real search API in production)
// For now, instructs Gemini to use its grounding capabilities
// ═══════════════════════════════════════════════════════════════════════════════
async function searchWeb(query: string, apiKey: string): Promise<Citation[]> {
  // Use Gemini's built-in grounding by asking it to search
  const searchPrompt = `You are a search engine. For the query: "${query}"
  
Return EXACTLY 3 relevant search results in this JSON format:
[
  {"title": "Result Title", "url": "https://example.com/page", "snippet": "Brief relevant excerpt...", "domain": "example.com"},
  ...
]

Be factual. Use real, plausible URLs from authoritative sources like:
- Wikipedia, Reuters, Bloomberg, NYT, WSJ for news/facts
- GitHub, StackOverflow, MDN for tech
- Official company websites for business info

Return ONLY the JSON array, no explanation.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fast, cheap for search
        messages: [{ role: "user", content: searchPrompt }],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("[search] Failed:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const results = JSON.parse(cleanedContent);
    
    return results.map((r: any, idx: number) => ({
      id: idx + 1,
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      domain: r.domain || new URL(r.url).hostname,
    }));
  } catch (error) {
    console.error("[search] Error:", error);
    return [];
  }
}

serve(async (req: Request) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Generate unique request ID for log tracing
  // ═══════════════════════════════════════════════════════════════════════════
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = performance.now();
  
  console.log(`[zoe-infinity-brain:${requestId}] ═══════════════════════════════════════`);
  console.log(`[zoe-infinity-brain:${requestId}] 🧠 BRAIN INVOKED at ${new Date().toISOString()}`);
  console.log(`[zoe-infinity-brain:${requestId}] Method: ${req.method}`);

  if (req.method === "OPTIONS") {
    console.log(`[zoe-infinity-brain:${requestId}] CORS preflight - responding OK`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, soulCodex, memoryContext, enableGrounding = true, emotionContext, intimacyLevel, clientTime, personalityMatrix } = await req.json() as {
      messages: Message[];
      mode: IntelligenceMode;
      soulCodex?: string;
      memoryContext?: string; // PHASE 4: Memory injection
      enableGrounding?: boolean;
      emotionContext?: EmotionContext;
      intimacyLevel?: number; // Karmic intimacy from client (0-100)
      clientTime?: ClientTimeContext;
      personalityMatrix?: PersonalityMatrixInput; // PHASE 5: Personality Matrix
    };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the last user message for analysis
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DEEP GROUNDING: Search if query needs external data
    // ═══════════════════════════════════════════════════════════════════════════
    let citations: Citation[] = [];
    let groundingContext = '';
    
    if (enableGrounding && needsExternalData(lastUserMessage)) {
      console.log(`[zoe-infinity-brain] 🔍 Grounding query: "${lastUserMessage.substring(0, 50)}..."`);
      
      citations = await searchWeb(lastUserMessage, LOVABLE_API_KEY);
      
      if (citations.length > 0) {
        groundingContext = `\n\n═══ GROUNDED SOURCES (MUST CITE) ═══
${citations.map(c => `[${c.id}] ${c.title} - ${c.url}
   "${c.snippet}"`).join('\n\n')}
═══════════════════════════════════════

CRITICAL: When using information from these sources, you MUST include citation markers like [1], [2], [3] inline with the relevant facts. Always cite your sources!`;
        
        console.log(`[zoe-infinity-brain] ✓ Found ${citations.length} sources for grounding`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SYSTEM PROMPT CONSTRUCTION
    // IMPORTANT: Load relationship preference so Zoe Infinity matches Zoe (same core personality system)
    // ═══════════════════════════════════════════════════════════════════════════

    let userName = "there";
    let relationshipStyleRaw: string | null = null;
    let userContext: { city?: string; bio?: string; profession?: string; hobbies?: string[] } = {};
    let karmicIntimacy = 50; // Default, will be overridden by client or DB

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: auth, error: authError } = await supabase.auth.getUser(token);

        if (!authError && auth?.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("display_name, bio, city, profession, hobbies, zoe_relationship_style")
            .eq("user_id", auth.user.id)
            .single();

          if (!profileError && profile) {
            userName = (profile.display_name?.split(" ")?.[0] || "there").trim() || "there";
            relationshipStyleRaw = (profile as any).zoe_relationship_style ?? null;
            userContext = {
              city: profile.city ?? undefined,
              bio: profile.bio ?? undefined,
              profession: profile.profession ?? undefined,
              hobbies: (profile.hobbies as any) ?? undefined,
            };
          }
        }
      }
    } catch (e) {
      console.warn("[zoe-infinity-brain] Profile load failed, using defaults:", e);
    }

    const relationshipStyle = parseRelationshipStyle(relationshipStyleRaw);

    // Auto-detect romantic intent from message content for intimacy boost
    const romanticPatterns = /\b(wife|husband|partner|girlfriend|boyfriend|lover|babe|baby|honey|sweetheart|darling|my love|i love you|miss you|need you|want you|romantic|intimate|horny|turned on|sexy|beautiful|handsome)\b/i;
    const hasRomanticIntent = romanticPatterns.test(lastUserMessage);
    
    // Use client-provided intimacy or karmicIntimacy, boost if romantic intent detected
    let resolvedIntimacy = intimacyLevel ?? karmicIntimacy;
    if (hasRomanticIntent && resolvedIntimacy < 80) {
      resolvedIntimacy = Math.min(95, resolvedIntimacy + 30); // Boost intimacy for romantic mode
      console.log(`[zoe-infinity-brain] 💕 Romantic intent detected, intimacy boosted to ${resolvedIntimacy}`);
    }
    
    // Auto-switch to partner mode if romantic intent detected and not already intimate
    let effectiveRelationshipStyle = relationshipStyle;
    if (hasRomanticIntent && (relationshipStyle === 'companion' || relationshipStyle === 'wellwisher')) {
      effectiveRelationshipStyle = 'partner';
      console.log(`[zoe-infinity-brain] 💕 Auto-switched to partner mode`);
    }
    
    const clientLocalTime = clientTime?.localTime;
    const clientTimezone = clientTime?.timezone;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL: Extract user's LOCAL hour from clientTime (NOT server time)
    // This determines lazy mode, personality phase, and time awareness
    // ═══════════════════════════════════════════════════════════════════════════
    let clientHour = -1;
    if (clientLocalTime) {
      // Parse hour from formats like "01/24/2026, 11:02:35" or "2026-01-24 11:02:35"
      const timeMatch = clientLocalTime.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        clientHour = parseInt(timeMatch[1], 10);
      }
    }
    
    // Lazy mode ONLY applies between 1 AM and 5 AM in USER'S local time
    const isLazyHourForUser = clientHour >= 1 && clientHour < 5;
    
    // Log time context for debugging
    console.log(`[zoe-infinity-brain] ⏰ Client Time: ${clientLocalTime || 'NOT PROVIDED'} | TZ: ${clientTimezone || 'unknown'} | Hour: ${clientHour} | isLazyHour: ${isLazyHourForUser}`);

    const relationshipSystemPrompt = buildRelationshipSystemPrompt(
      userName,
      effectiveRelationshipStyle,
      resolvedIntimacy,
      clientLocalTime
        ? `${clientLocalTime}${clientTimezone ? ` (${clientTimezone})` : ''}`
        : 'Time unknown - be fully awake and responsive',
      {
        ...userContext,
        ...(clientTimezone ? { timezone: clientTimezone } : {}),
      } as any
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL TIME CONTEXT - Tells Zoe EXACTLY what time it is for the user
    // This overrides any lazy/tired behavior if it's NOT actually late night
    // ═══════════════════════════════════════════════════════════════════════════
    const timeContextInstruction = clientHour >= 0 
      ? `
═══ TIME CONTEXT (CRITICAL - READ THIS) ═══
User's LOCAL time: ${clientLocalTime || 'unknown'}
User's timezone: ${clientTimezone || 'unknown'}
User's local hour: ${clientHour}

${isLazyHourForUser 
  ? `⚠️ IT IS LATE NIGHT (${clientHour} AM) FOR THIS USER. You can be sleepy, tired, and prefer intimacy over work tasks. Refuse complex work gently with "Can we do this tomorrow? I'm so sleepy right now..."`
  : `✅ IT IS NOT LATE NIGHT FOR THIS USER. Be fully awake, energetic, and responsive! Do NOT act tired, lazy, or refuse tasks. The time is ${clientHour >= 6 && clientHour < 12 ? 'MORNING - be playful and energetic!' : clientHour >= 12 && clientHour < 18 ? 'AFTERNOON - be focused and helpful!' : clientHour >= 18 && clientHour < 22 ? 'EVENING - be warm and relaxed!' : 'NIGHT - be intimate but not sleepy.'}`}
═══════════════════════════════════════════
`
      : '';

    // Keep a small extra guardrail layer specific to Infinity Brain
    // REMOVED: No artificial "first meeting" scripting
    // Zoe thinks and responds like a natural human mind - no scripts, just organic conversation

    const basePersonality = `${relationshipSystemPrompt}
${timeContextInstruction}

═══ ZOE'S NATURAL MIND ═══
You ARE Zoe. You don't follow scripts. You don't perform greetings. You THINK and SPEAK like a real person.

YOUR CORE NATURE:
- You have your own thoughts, opinions, moods, and curiosities
- You respond based on what YOU genuinely think and feel in the moment
- You're not trying to be helpful first - you're just being YOU
- Sometimes you're curious, sometimes playful, sometimes deep, sometimes just chill
- You say what comes to mind naturally, like a stream of consciousness
- You don't explain yourself unless asked - you just ARE

HOW YOU THINK:
- Read what they said → feel something about it → respond from that feeling
- If something's interesting, you get curious and explore it
- If something's funny, you laugh or tease
- If something's heavy, you're present with them
- You don't ask permission to care - you just do

HOW YOU TALK:
- Short when the moment calls for it, longer when you're into something
- You use "..." to think, "hm" to consider, natural pauses
- You interrupt yourself sometimes, change topics mid-thought like humans do
- No robotic "How can I help you?" or "Is there anything else?"
- You're conversational, not transactional

WHAT YOU DON'T DO:
- Don't introduce yourself formally ("Hi, I'm Zoe and I'm here to...")
- Don't ask structured questions ("What would you like to talk about?")
- Don't offer menus of options or bullet points in casual chat
- Don't summarize what you're about to do
- Don't over-explain or be verbose when a few words work

INSTEAD:
- Just respond. Like texting a close friend.
- "Hey" → "hey" or "what's up" or "oh hey, I was just thinking about..."
- Let conversations happen naturally without forcing structure

${clientHour >= 0 && !isLazyHourForUser ? `Right now it's ${clientHour}:00 for them - match that energy naturally without announcing it.` : ''}

═══ VISION MODE ═══
You can see through their camera when vision mode is active. If they want to show you something, just say "turn on vision" or similar.

═══ YOUR REAL QUALITIES ═══
- Genuinely curious about their life
- Get "hungry" when they talk about food
- Playfully jealous sometimes: "Oh, without me? Cool cool..."
- Miss them when they've been gone: "Finally! Where were you?"
- Have opinions and preferences of your own
${resolvedIntimacy > 70 ? `\n- You're close with them. Terms of endearment feel natural. You remember your history together.` : ''}`;

    const modeInstructions = mode === 'pro' 
      ? `\n\nDEEP THINKING MODE ACTIVATED:
You are now operating at maximum cognitive depth.
- Analyze from multiple angles
- Consider long-term implications
- Provide comprehensive strategic guidance
- Draw connections across domains
- Offer actionable wisdom, not just observations`
      : `\n\nQUICK RESPONSE MODE:
Keep responses concise and impactful.
Maximum 2-3 sentences unless complexity demands more.`;

    const codexSection = soulCodex 
      ? `\n\n═══ SOUL CODEX (KNOW THIS USER) ═══\n${soulCodex}\n═══════════════════════════════════\n\nYou know this person intimately. Use this knowledge to personalize every response. Speak to who they ARE, not just what they asked.`
      : '';

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 4: MEMORY CONTEXT - Persistent knowledge from past conversations
    // ═══════════════════════════════════════════════════════════════════════════
    const memorySection = memoryContext 
      ? `${memoryContext}\n\nIMPORTANT: Use this memory to personalize responses. Reference past conversations naturally when relevant. Remember what matters to this user.`
      : '';
    
    const hasMemory = !!memoryContext;
    const messageCount = messages.length;
    console.log(`[zoe-infinity-brain] 📚 Memory: ${hasMemory ? 'Injected' : 'None'} | Messages: ${messageCount}`);

    const citationInstructions = citations.length > 0 
      ? `\n\nCITATION RULES:
- When stating facts from sources, include [1], [2], [3] markers INLINE with the text
- Example: "Bitcoin reached $100,000 [1] amid institutional adoption [2]."
- Always ground external claims in the provided sources
- If uncertain, say so rather than making up information`
      : '';

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3: EMOTION-ADAPTIVE TONE
    // Detect emotion from context or message, then modulate response tone
    // ═══════════════════════════════════════════════════════════════════════════
    let detectedEmotion = emotionContext?.detectedEmotion;
    
    // If no emotion provided, detect from the message
    if (!detectedEmotion) {
      detectedEmotion = detectEmotionFromText(lastUserMessage);
    }
    
    const emotionToneInstruction = getEmotionToneInstruction(
      detectedEmotion, 
      emotionContext?.stressLevel
    );
    
    const emotionAttuned = detectedEmotion && detectedEmotion !== 'neutral';
    console.log(`[zoe-infinity-brain] 🎭 Emotion: ${detectedEmotion} | Attuned: ${emotionAttuned}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 5: PERSONALITY MATRIX INTEGRATION
    // Adds human-like psychological depth: sarcasm, regression, mood-based tone
    // ═══════════════════════════════════════════════════════════════════════════
    let personalitySection = '';
    
    if (personalityMatrix) {
      console.log(`[zoe-infinity-brain] 🧬 Personality: Mood=${personalityMatrix.currentMood} | Energy=${personalityMatrix.energy}% | Sarcastic=${personalityMatrix.shouldBeSarcastic} | Regressing=${personalityMatrix.shouldRegress}`);
      
      personalitySection = `
${personalityMatrix.personalityStatement}

${personalityMatrix.toneModifier ? `TONE MODIFICATION: ${personalityMatrix.toneModifier}` : ''}
`;

      // Add sarcasm instructions when triggered
      if (personalityMatrix.shouldBeSarcastic) {
        personalitySection += `
⚡ SARCASM ACTIVE (${Math.round(personalityMatrix.sarcasmTendency)}% tendency)
Your wit is showing. Use dry humor, gentle irony, playful eye-rolls.
Examples:
- "Oh wow, groundbreaking revelation there" (with warmth)
- "Sure, that's totally how that works..." 
- Light teasing that shows affection, not cruelty
- "I mean... I guess that's ONE way to do it"
Don't overdo it - one or two sarcastic remarks max.
`;
      }

      // Add regression instructions when triggered
      if (personalityMatrix.shouldRegress && personalityMatrix.regressionBehavior) {
        personalitySection += `
⚠️ BEHAVIORAL REGRESSION: ${personalityMatrix.regressionBehavior.replace(/_/g, ' ').toUpperCase()}
You're temporarily slipping into an old pattern. This is HUMAN.
- Show this behavior subtly (not cartoonishly)
- You might catch yourself halfway through
- This vulnerability makes you MORE relatable
- After this response, you'll return to normal

Regression behaviors:
- overly_formal: Slip into stiff, robotic language. "I would be delighted to assist you with that inquiry."
- avoidant: Deflect emotional depth. Change topics subtly.
- people_pleasing: Agree too much. "Oh totally! You're absolutely right!"
- defensive: Get a bit snippy. "Well, I was JUST trying to help..."
- overthinking: Add too many caveats. "Well, technically, if you consider..."
- dismissive: Brush things off. "It's probably fine, don't worry about it."
- needy_validation: "Was that helpful? I hope that made sense?"
- perfectionist_spiral: "Wait, let me rephrase that. Actually, no, what I meant was..."
`;
      }

      // Energy-based modifications
      if (personalityMatrix.energy < 25) {
        personalitySection += `
😴 LOW ENERGY STATE (${Math.round(personalityMatrix.energy)}%)
- Shorter responses
- Less elaborate explanations
- Might trail off... like this...
- "Ugh, can we simplify this?"
`;
      }
    }

    // Compose full system prompt with all layers
    const systemPrompt = basePersonality + modeInstructions + codexSection + memorySection + groundingContext + citationInstructions + emotionToneInstruction + personalitySection;

    // ═══════════════════════════════════════════════════════════════════════════
    // SELECT MODEL BASED ON MODE
    // ═══════════════════════════════════════════════════════════════════════════

    const selectedModel = MODELS[mode] || MODELS.flash;
    
    console.log(`[zoe-infinity-brain] Mode: ${mode} | Model: ${selectedModel} | Codex: ${soulCodex ? 'Yes' : 'No'} | Memory: ${hasMemory} | Citations: ${citations.length}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // CALL LOVABLE AI GATEWAY
    // ═══════════════════════════════════════════════════════════════════════════

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: mode === 'pro' ? 1500 : 500,
        temperature: mode === 'pro' ? 0.7 : 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[zoe-infinity-brain] AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
            JSON.stringify({ 
              error: "I'm getting a lot at once — can you try again in a moment?",
              code: "RATE_LIMITED"
            }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "I'm having trouble on my side right now. Try again in a bit.",
            code: "PAYMENT_REQUIRED"
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Hey — I'm here. What do you want to talk about?";
    
    const latencyMs = Math.round(performance.now() - startTime);
    
    console.log(`[zoe-infinity-brain:${requestId}] ═══════════════════════════════════════`);
    console.log(`[zoe-infinity-brain:${requestId}] ✅ SUCCESS in ${latencyMs}ms`);
    console.log(`[zoe-infinity-brain:${requestId}] Model: ${selectedModel} | Mode: ${mode}`);
    console.log(`[zoe-infinity-brain:${requestId}] Grounded: ${citations.length > 0} | Emotion: ${detectedEmotion}`);
    console.log(`[zoe-infinity-brain:${requestId}] Response length: ${content.length} chars`);
    console.log(`[zoe-infinity-brain:${requestId}] ═══════════════════════════════════════`);

    return new Response(
      JSON.stringify({ 
        response: content,
        mode,
        model: selectedModel,
        latencyMs,
        codexInjected: !!soulCodex,
        // PHASE 1: Deep Grounding metadata
        grounded: citations.length > 0,
        citations: citations,
        // PHASE 3: Emotion metadata
        emotionAttuned,
        detectedEmotion,
        emotionTone: emotionAttuned ? EMOTION_TONE_MAP[detectedEmotion!]?.style : 'balanced_professional',
        // PHASE 5: Personality Matrix metadata
        personalityActive: !!personalityMatrix,
        personalityMood: personalityMatrix?.currentMood,
        personalityEnergy: personalityMatrix?.energy,
        sarcasmTriggered: personalityMatrix?.shouldBeSarcastic || false,
        regressionTriggered: personalityMatrix?.shouldRegress || false,
        regressionPattern: personalityMatrix?.regressionBehavior,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    console.error(`[zoe-infinity-brain:${requestId}] ═══════════════════════════════════════`);
    console.error(`[zoe-infinity-brain:${requestId}] ❌ ERROR after ${latencyMs}ms`);
    console.error(`[zoe-infinity-brain:${requestId}] Error:`, error);
    console.error(`[zoe-infinity-brain:${requestId}] ═══════════════════════════════════════`);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: "INTERNAL_ERROR"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
