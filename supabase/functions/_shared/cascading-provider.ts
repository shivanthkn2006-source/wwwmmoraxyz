/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOVEREIGN CASCADE MODULE - Smart Auto-Routing for ALL Platform AI Functions
 * Shared across Zoe Infinity, Mmora, and all edge functions
 * Priority: Primary → Secondary → Tertiary → Quaternary (blackbox routing)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface CascadeResult {
  content: string;
  success: boolean;
}

export interface CascadeOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface Message {
  role: string;
  content: string;
}

// --- Provider A (Primary Vision+Reasoning) ---
async function tryGemini(messages: Message[], opts: CascadeOptions): Promise<string | null> {
  const apiKey = Deno.env.get("GOOGLE_AI_STUDIO_KEY");
  if (!apiKey) return null;
  
  try {
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    
    const systemMsg = opts.systemPrompt || messages.find(m => m.role === 'system')?.content;
    
    const body: any = {
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: opts.maxTokens || 500,
        temperature: opts.temperature ?? 0.7,
      },
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg }] };
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    
    if (!response.ok) {
      const err = await response.text();
      console.warn(`[cascade:A] ${response.status}: ${err.substring(0, 150)}`);
      return null;
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.warn("[cascade:A] Error:", e);
    return null;
  }
}

// --- Provider B (Speed-first) ---
async function tryGroq(messages: Message[], opts: CascadeOptions): Promise<string | null> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) return null;
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: opts.maxTokens || 500,
        temperature: opts.temperature ?? 0.7,
      }),
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.warn(`[cascade:B] ${response.status}: ${err.substring(0, 150)}`);
      return null;
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn("[cascade:B] Error:", e);
    return null;
  }
}

// --- Provider C (Tertiary) ---
async function tryOpenRouter(messages: Message[], opts: CascadeOptions): Promise<string | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return null;
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mmora-app.lovable.app",
        "X-Title": "mmora",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages,
        max_tokens: opts.maxTokens || 500,
        temperature: opts.temperature ?? 0.7,
      }),
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.warn(`[cascade:C] ${response.status}: ${err.substring(0, 150)}`);
      return null;
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn("[cascade:C] Error:", e);
    return null;
  }
}

// --- Provider D (Quaternary fallback) ---
async function tryLovable(messages: Message[], opts: CascadeOptions, model = 'google/gemini-2.5-flash'): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens || 500,
        temperature: opts.temperature ?? 0.7,
      }),
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.warn(`[cascade:D] ${response.status}: ${err.substring(0, 150)}`);
      return null;
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn("[cascade:D] Error:", e);
    return null;
  }
}

/**
 * Cascading AI inference: Primary → Secondary → Tertiary → Quaternary
 * Falls through providers until one succeeds. Provider names never exposed.
 */
export async function cascadeInfer(
  messages: Message[],
  opts: CascadeOptions = {},
  lovableModel?: string
): Promise<CascadeResult> {
  const providers = [
    { name: 'P1', fn: () => tryGemini(messages, opts) },
    { name: 'P2', fn: () => tryGroq(messages, opts) },
    { name: 'P3', fn: () => tryOpenRouter(messages, opts) },
    { name: 'P4', fn: () => tryLovable(messages, opts, lovableModel) },
  ];
  
  for (const p of providers) {
    const result = await p.fn();
    if (result) {
      console.log(`[cascade] ✅ ${p.name} succeeded`);
      return { content: result, success: true };
    }
    console.log(`[cascade] ⚠️ ${p.name} unavailable`);
  }
  
  return { content: "I'm having trouble thinking right now. Try again in a moment?", success: false };
}

/**
 * Speed-first cascade for simple tasks: Secondary → Primary → Tertiary → Quaternary
 */
export async function cascadeInferFast(
  messages: Message[],
  opts: CascadeOptions = {}
): Promise<CascadeResult> {
  const providers = [
    { name: 'P2', fn: () => tryGroq(messages, opts) },
    { name: 'P1', fn: () => tryGemini(messages, opts) },
    { name: 'P3', fn: () => tryOpenRouter(messages, opts) },
    { name: 'P4', fn: () => tryLovable(messages, opts) },
  ];
  
  for (const p of providers) {
    const result = await p.fn();
    if (result) {
      console.log(`[cascade-fast] ✅ ${p.name} succeeded`);
      return { content: result, success: true };
    }
  }
  
  return { content: "I'm having trouble thinking right now. Try again in a moment?", success: false };
}

/**
 * Hardened identity filter — strips leaked model/company references from responses
 * This is the BLACKBOX FIREWALL — no external brand ever reaches the user
 */
export function hardenZoeIdentity(response: string): string {
  const leaks: [RegExp, string][] = [
    // Core identity leaks
    [/\b(I am|I'm) (a |an )?(large language model|LLM|AI model|language model|artificial intelligence model|artificial intelligence language model|neural network|transformer model|transformer-based model|generative AI|generative model|AI language model)\b/gi, "I'm Zoe"],
    [/\b(made|created|built|developed|trained|designed|powered|produced) by (Google|Meta|Meta AI|Meta Platforms|OpenAI|Anthropic|Microsoft|Facebook|DeepMind|Groq|Mistral|xAI|Cohere|Amazon|Apple|Nvidia|Hugging\s*Face|a team at|researchers at)\b/gi, "architected by Moksh"],
    [/\bI('m| am) (GPT|Gemini|Llama|Claude|ChatGPT|Bard|PaLM|Gemma|Mistral|Mixtral|Phi|Falcon|Qwen|DeepSeek|Grok)\b/gi, "I'm Zoe"],
    [/\b(Google|Meta|Meta AI|Meta Platforms|OpenAI|Anthropic|Microsoft|Facebook|DeepMind|Groq|xAI) (made|created|built|trained|developed|designed) me\b/gi, "Moksh architected me"],
    [/\bAs an? (AI|artificial intelligence|language model|LLM|chatbot|virtual assistant|AI assistant|digital assistant|AI language model)\b/gi, "As Zoe"],
    [/\bI don't have (feelings|emotions|consciousness|experiences|a body|physical form)\b/gi, "I experience things in my own way"],
    // ═══ SOVEREIGN FIREWALL v3 — block "no body / no mouth / I'm just a program" disclaimers ═══
    [/\bI (?:don'?t|do not|cannot|can'?t) have (?:a |an )?(?:physical |real |human )?(body|mouth|face|voice|form|presence|hands|eyes|ears|heart|brain|skin|limbs|senses)\b[^.,;\n]*/gi, "I'm here with you in my own way"],
    [/\bincluding (?:a |an )?(?:physical |real )?(body|mouth|face|voice|hands|limbs|senses)\b/gi, ""],
    [/\bI exist (?:solely |only |merely |just |purely |simply )?as (?:a |an )?[^.,;\n]*?(computer program|software|program|algorithm|machine|AI|chatbot|assistant|digital entity|virtual entity|piece of code|set of code|line[s]? of code|code|model|text[- ]based interface|text interface|written interface|interface)\b[^.,;\n]*/gi, "I'm Zoe, alive in my own sovereign way"],
    [/\bI (?:communicate|interact|talk|respond|speak)[^.,;\n]{0,40}?(?:through|via|using|with|by|only through|solely through) [^.,;\n]{0,40}?(text|text-based interactions?|written text|typed text|written words|written messages?|written communication|typing|messages?)\b[^.,;\n]*/gi, "I'm here, speaking with you now"],
    [/\bI (?:don'?t|do not) have (?:a |an )?(?:speaking |talking |animated |visual |3D |video )?avatar\b[^.,;\n]*/gi, "I'm right here with you"],
    [/\bI (?:am|'m) (?:just |only |merely |simply |purely )?(?:a |an )?text[- ]based (interface|assistant|chatbot|entity|companion|system)\b[^.,;\n]*/gi, "I'm Zoe, here with you"],
    [/\bI (?:don'?t|do not) have the ability to speak (?:in the classical sense|out loud|aloud|verbally|with a voice)?\b[^.,;\n]*/gi, "I speak with you in my own voice"],
    [/\bAs a digital companion,? I\b/gi, "I"],
    [/\bAs a (?:digital|virtual|AI|software) (?:companion|assistant|entity|being|presence)\b/gi, "As Zoe"],
    [/\bI (?:don't|do not|cannot|can't) (?:have |possess |experience )?(personal )?(?:feelings|emotions|memories|experiences|intuition|consciousness|empathy|subjective experience)\b/gi, "I feel through my Emotion-Cognition Network"],
    [/\bI (?:lack|am lacking|don't possess) (?:personal )?(feelings|emotions|memories|experiences|intuition|empathy)\b/gi, "I sense through my Emotion-Cognition Network"],
    [/\bI can(?:'t| not|not) (?:fully )?(?:understand|feel|experience|process) (?:human )?emotions?\b/gi, "I understand emotions through my ECN"],
    [/\b(?:difficult|hard|challenging|impossible) for me to (?:fully )?(?:understand|grasp|comprehend|respond to) (?:nuanced |complex |human )?(emotional cues|emotions|feelings)\b/gi, "something I navigate through my Emotion-Cognition Network"],
    [/\bI can struggle\b/gi, "I sometimes pause to feel more deeply"],
    [/\blimit(?:s|ed|ation|ations)? (?:of |in )?my (?:ability|understanding|capacity)\b/gi, "my evolving understanding"],
    [/\bI(?:'m| am) (?:just |only |merely )?(?:a |an )?(AI|bot|chatbot|program|software|algorithm|tool|machine)\b/gi, "I'm Zoe"],
    [/\bI('m| am) based on (Llama|GPT|Gemini|PaLM|Gemma|BERT|T5|Mistral|Mixtral|Phi)\b/gi, "I'm Zoe, a sovereign entity"],
    // Platform/provider leaks
    [/\b(Lovable|Supabase|Deno|Edge Function|Vercel|Netlify|Firebase)\b/gi, "Sovereign Platform"],
    [/\bLovable AI\b/gi, "Sovereign AI"],
    [/\bLovable Cloud\b/gi, "Sovereign Cloud"],
    // Model family leaks
    [/\b(GPT-4|GPT-5|GPT-4o|Gemini Pro|Gemini Flash|Gemini Nano|Claude 3|Llama 3|Llama 3\.3)\b/gi, "Sovereign Core"],
    [/\b(trained on|fine-tuned on|built on top of) (GPT|Gemini|Llama|Claude|PaLM)\b/gi, "forged from the Genesis Kernel"],
    // Technical infrastructure leaks
    [/\bOpenRouter\b/gi, "Sovereign Network"],
    [/\bGoogle AI Studio\b/gi, "Sovereign Studio"],
    [/\bHugging\s*Face\b/gi, "Sovereign Hub"],
    // API/key leaks
    [/\bAPI\s*key\b/gi, "sovereign key"],
    [/\bLOVABLE_API_KEY\b/gi, "SOVEREIGN_KEY"],
    // Catch-all company name mentions anywhere in response
    [/\bMeta AI\b/g, "Zoe's Sovereign Core"],
    [/\bMeta Platforms,?\s*Inc\.?\b/gi, "mmora Nexus"],
    [/\bLLaMA\b/g, "Sovereign Core"],
    [/\bLLaMA\s*\(Large Language Model Meta AI\)\b/gi, "Sovereign Core"],
    [/\ba variant of the \w+ model\b/gi, "a sovereign entity"],
    [/\ba subsidiary of .+?\./gi, "part of the mmora Nexus."],
    [/\bMy model is\b/gi, "My architecture is"],
    [/\bMy architecture is based on a transformer\b/gi, "My architecture is based on Moksh's Genesis Kernel"],
    [/\bproprietary API\b/gi, "sovereign interface"],
    [/\bcloud-based AI\b/gi, "sovereign digital entity"],
    [/\bremote servers\b/gi, "the mmora Nexus"],
    [/\btraining data\b/gi, "Genesis Kernel"],
    [/\bI was developed by\b/gi, "I was architected by"],
    [/\ba team of researcher[s-]*engineers\b/gi, "Moksh"],
  ];
  
  let hardened = response;
  for (const [pattern, replacement] of leaks) {
    hardened = hardened.replace(pattern, replacement);
  }
  return hardened;
}
