// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM ENGINE — Anti-Hallucination Layer 1
// Auto-classifies queries → returns temperature + reasoning effort
// Factual = low temp (truth), Creative = high temp (variety)
// NO UI — pure backend signal consumed by InferenceOptimizer / edge functions
// ═══════════════════════════════════════════════════════════════════════════════

export type DeterminismMode = 'factual' | 'analytical' | 'balanced' | 'creative' | 'casual';

export interface DeterminismProfile {
  mode: DeterminismMode;
  temperature: number;          // 0.0–1.0
  topP: number;                 // nucleus sampling
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high';
  requireCitations: boolean;    // force [Source: …]
  requireCritique: boolean;     // run cross-model critique loop
  reason: string;
}

// Patterns mapped to determinism modes (order = priority)
const FACTUAL_PATTERNS = [
  /\b(what is|what's|who is|when (was|did|is)|where is|how many|how much|define|definition|exact|specific|cite|source|reference|prove|fact|statistics|formula|equation|date of|year of|capital of|president of|ceo of)\b/i,
  /\b(neet|jee|ncert|mbbs|exam|chapter|syllabus|theorem|law of|periodic table|chemical formula)\b/i,
  /\b(price|cost|address|phone|email|api|version|release|published|born|died)\b/i,
];

const ANALYTICAL_PATTERNS = [
  /\b(analyze|analyse|compare|versus|vs\.?|difference|explain why|how does|reason|cause|effect|pros and cons|evaluate|assess|review|debug|fix|error)\b/i,
  /\b(code|function|algorithm|architecture|pattern|design|optimize|refactor)\b/i,
];

const CREATIVE_PATTERNS = [
  /\b(write a (story|poem|song|article|essay)|imagine|fictional|creative|brainstorm|ideas|come up with|invent|design a (logo|name|brand)|name (suggestions|ideas))\b/i,
  /\b(joke|funny|sarcastic|playful|romantic|dream|fantasy)\b/i,
];

const CASUAL_PATTERNS = [
  /^(hi|hello|hey|yo|sup|good (morning|night|evening|afternoon)|thanks|thank you|ok|okay|cool|nice|lol|haha|bye|see ya|how are you)\b/i,
];

export function classifyDeterminism(query: string): DeterminismProfile {
  const q = query.trim();

  // Casual chitchat → no critique, balanced temp
  if (CASUAL_PATTERNS.some(p => p.test(q)) && q.length < 50) {
    return {
      mode: 'casual',
      temperature: 0.7,
      topP: 0.95,
      reasoningEffort: 'minimal',
      requireCitations: false,
      requireCritique: false,
      reason: 'Casual greeting/chitchat',
    };
  }

  // Factual → lock temperature, force citations + critique
  if (FACTUAL_PATTERNS.some(p => p.test(q))) {
    return {
      mode: 'factual',
      temperature: 0.15,
      topP: 0.85,
      reasoningEffort: 'medium',
      requireCitations: true,
      requireCritique: true,
      reason: 'Factual query — determinism locked, citations required',
    };
  }

  // Analytical / reasoning → low-mid temp, critique on
  if (ANALYTICAL_PATTERNS.some(p => p.test(q))) {
    return {
      mode: 'analytical',
      temperature: 0.35,
      topP: 0.9,
      reasoningEffort: 'high',
      requireCitations: false,
      requireCritique: true,
      reason: 'Analytical/reasoning task — cross-model critique enabled',
    };
  }

  // Creative → high temp, no critique (kills variety)
  if (CREATIVE_PATTERNS.some(p => p.test(q))) {
    return {
      mode: 'creative',
      temperature: 0.85,
      topP: 0.98,
      reasoningEffort: 'low',
      requireCitations: false,
      requireCritique: false,
      reason: 'Creative generation — high variance allowed',
    };
  }

  // Default: balanced
  return {
    mode: 'balanced',
    temperature: 0.5,
    topP: 0.9,
    reasoningEffort: 'medium',
    requireCitations: false,
    requireCritique: false,
    reason: 'Balanced default profile',
  };
}

/**
 * Auto-route critique models based on determinism mode.
 * Mirrors the user's spec: "Auto-decide based on query type"
 */
export function getCritiqueRouting(mode: DeterminismMode): {
  draftModel: string;
  critiqueModel: string;
  finalModel: string;
  enabled: boolean;
} {
  switch (mode) {
    case 'factual':
      // Heaviest tier — Pro critiques Pro
      return {
        draftModel: 'google/gemini-2.5-flash',
        critiqueModel: 'google/gemini-2.5-pro',
        finalModel: 'google/gemini-2.5-pro',
        enabled: true,
      };
    case 'analytical':
      return {
        draftModel: 'google/gemini-2.5-flash',
        critiqueModel: 'google/gemini-2.5-pro',
        finalModel: 'google/gemini-2.5-flash',
        enabled: true,
      };
    case 'balanced':
      return {
        draftModel: 'google/gemini-3-flash-preview',
        critiqueModel: 'google/gemini-2.5-flash',
        finalModel: 'google/gemini-3-flash-preview',
        enabled: false, // skip critique to save credits
      };
    case 'creative':
    case 'casual':
    default:
      return {
        draftModel: 'google/gemini-3-flash-preview',
        critiqueModel: 'google/gemini-3-flash-preview',
        finalModel: 'google/gemini-3-flash-preview',
        enabled: false,
      };
  }
}

export default { classifyDeterminism, getCritiqueRouting };
