// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT DETECTOR - Intent Classification for Vision/Chronicle/Education
// Part 5: The Visionary (Protocol Artifact)
// ═══════════════════════════════════════════════════════════════════════════════

export type ArtifactType = 'vision' | 'chronicle' | 'education' | 'none';

export interface ArtifactIntent {
  type: ArtifactType;
  confidence: number;
  extractedSubject: string;
  originalPrompt: string;
}

// Confidence threshold for artifact generation - must be >= this value
export const ARTIFACT_CONFIDENCE_THRESHOLD = 0.85;

const normalizeVisionSubject = (raw: string, originalMessage: string): string => {
  let s = (raw || '').trim();
  if (!s) s = originalMessage.trim();

  // Strip leading command phrasing if the regex captured too much.
  s = s
    .replace(/^(can\s+you\s+)?(please\s+)?(create|make|generate|draw|paint|sketch|illustrate|depict|render)\b/i, '')
    .replace(/^\s*me\b/i, '')
    .replace(/^\s*(an?|the)\b\s*/i, '')
    .replace(/^\s*image\s+of\b\s*/i, '')
    .replace(/^\s*(of)\b\s*/i, '');

  // Remove media words that often cause the model to literally draw text/labels.
  s = s.replace(/\b(image|picture|photo|visual|pic)\b/gi, '');

  // Remove stray punctuation that can be interpreted as "include text".
  s = s.replace(/["“”'`]/g, '');

  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim();

  // If we stripped everything, fall back.
  return s || originalMessage.trim();
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATIONAL REQUEST GUARD - Prevents false positives for guides, lists, etc.
// ═══════════════════════════════════════════════════════════════════════════════

const INFORMATIONAL_PATTERNS = [
  /\b(guide|list|steps|tutorial|explain|documentation|how\s+to|tell\s+me|what\s+is|components?|instructions?|ways?\s+to|help\s+me\s+with|teach|learn|understand)\b/i
];

const isInformationalRequest = (message: string): boolean => {
  return INFORMATIONAL_PATTERNS.some(p => p.test(message));
};

const VISION_PATTERNS = [
  // Direct image requests - REQUIRES explicit image/visual keywords
  /(?:create|make|generate|give\s+me)\s+(?:me\s+)?(?:an?\s+)?(image|picture|photo|visual|pic|art|artwork)\s+(?:of\s+)?(.+)/i,
  /(?:can\s+you\s+)?(?:create|make|generate|draw|paint)\s+(?:me\s+)?(?:an?\s+)?(image|picture|photo|visual|art|artwork)\s+(?:of\s+)?(.+)/i,
  
  // Show/visualize requests - REQUIRES image keyword
  /show\s+me\s+(?:an?\s+)?(image|picture|photo|visual)\s+(?:of\s+)?(.+)/i,
  /visualize\s+(.+)/i,
  /what\s+did\s+(.+)\s+look\s+like/i,
  /what\s+does\s+(.+)\s+look\s+like/i,
  
  // Creative requests - These are explicitly visual by nature
  /draw\s+(?:me\s+)?(?:an?\s+)?(.+)/i,
  /paint\s+(?:me\s+)?(?:an?\s+)?(.+)/i,
  /illustrate\s+(.+)/i,
  /depict\s+(.+)/i,
  /render\s+(?:an?\s+)?(image|picture|visual|art)\s+(?:of\s+)?(.+)/i,
  /sketch\s+(?:me\s+)?(?:an?\s+)?(.+)/i,
  
  // "I want to see" requests - REQUIRES image keyword
  /i\s+want\s+to\s+see\s+(?:an?\s+)?(image|picture|photo|visual)\s+(?:of\s+)?(.+)/i,
  /i\s+(?:want|need|would\s+like)\s+(?:an?\s+)?(image|picture|photo|art)\s+(?:of\s+)?(.+)/i,
  
  // Simple object requests with image keywords
  /(?:image|picture|photo|visual)\s+of\s+(?:an?\s+)?(.+)/i,
  
  // Historical/world visualization - explicit "look like" phrasing
  /(\d+)\s*(?:years?|centuries?|millennia?)\s*ago/i,
];

const CHRONICLE_PATTERNS = [
  /give\s+me\s+(?:a\s+)?report\s+(?:on\s+)?(.+)?/i,
  /create\s+(?:a\s+)?(?:report|document|summary)\s+(?:on\s+|about\s+)?(.+)?/i,
  /summarize\s+(?:this|our\s+conversation|everything)(.+)?/i,
  /document\s+(?:this|our\s+)?(.+)?/i,
  /compile\s+(?:this|a\s+report|everything)(.+)?/i,
  /generate\s+(?:a\s+)?pdf\s+(.+)?/i,
  /export\s+(?:this|our\s+conversation)(.+)?/i,
  /make\s+(?:a\s+)?(?:report|pdf|document)(.+)?/i,
  /write\s+up\s+(.+)/i,
];

const EDUCATION_PATTERNS = [
  /teach\s+(?:my\s+)?(.+)/i,
  /create\s+(?:a\s+)?worksheet\s+(?:for\s+|on\s+|about\s+)?(.+)/i,
  /make\s+(?:a\s+)?(?:worksheet|quiz|test|exercise)\s+(?:for\s+|on\s+|about\s+)?(.+)/i,
  /generate\s+(?:a\s+)?(?:worksheet|practice\s+problems?)\s+(?:for\s+|on\s+)?(.+)/i,
  /practice\s+problems?\s+(?:for\s+|on\s+|about\s+)?(.+)/i,
  /homework\s+(?:on\s+|for\s+|about\s+)?(.+)/i,
  /(?:help\s+)?(?:my\s+)?(?:son|daughter|child|kid)\s+(?:learn|study|practice)\s+(.+)/i,
  /exercises?\s+(?:for\s+|on\s+|about\s+)?(.+)/i,
  /quiz\s+(?:me\s+)?(?:on\s+|about\s+)?(.+)/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTOR FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function detectArtifactIntent(message: string): ArtifactIntent {
  const lowerMessage = message.toLowerCase().trim();
  
  // GUARD: Skip artifact detection for informational requests (guides, lists, tutorials, etc.)
  if (isInformationalRequest(lowerMessage)) {
    console.log('[ArtifactDetector] Informational request detected, skipping vision detection');
    return {
      type: 'none',
      confidence: 1.0,
      extractedSubject: '',
      originalPrompt: message,
    };
  }
  
  // Check Vision patterns first (highest priority for visual requests)
  for (const pattern of VISION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      // Extract the subject from the appropriate capture group
      const subject = normalizeVisionSubject(match[2]?.trim() || match[1]?.trim() || message, message);
      return {
        type: 'vision',
        confidence: 0.9,
        extractedSubject: subject,
        originalPrompt: message,
      };
    }
  }
  
  // Check Education patterns (worksheets, teaching)
  for (const pattern of EDUCATION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return {
        type: 'education',
        confidence: 0.85,
        extractedSubject: match[1]?.trim() || 'general practice',
        originalPrompt: message,
      };
    }
  }
  
  // Check Chronicle patterns (reports, documents)
  for (const pattern of CHRONICLE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return {
        type: 'chronicle',
        confidence: 0.85,
        extractedSubject: match[1]?.trim() || 'conversation summary',
        originalPrompt: message,
      };
    }
  }
  
  // No artifact intent detected
  return {
    type: 'none',
    confidence: 1.0,
    extractedSubject: '',
    originalPrompt: message,
  };
}

/**
 * Check if artifact intent meets the confidence threshold for generation
 * Use this before generating any artifacts to reduce false positives
 */
export function shouldGenerateArtifact(intent: ArtifactIntent): boolean {
  return intent.type !== 'none' && intent.confidence >= ARTIFACT_CONFIDENCE_THRESHOLD;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT ENHANCERS
// ═══════════════════════════════════════════════════════════════════════════════

export function enhanceVisionPrompt(subject: string): string {
  // Add cinematic quality to the prompt
  const cinematicEnhancements = [
    'Ultra high resolution',
    'cinematic lighting',
    'dramatic composition',
    'photorealistic',
    'masterpiece quality',
    '8K detail',
  ];
  
  return `${cinematicEnhancements.join(', ')}: ${subject}. Breathtaking visual, museum quality artwork.`;
}

export function enhanceEducationPrompt(subject: string): string {
  return `Create a clean, professional educational worksheet for: ${subject}. Include clear instructions, practice problems, and answer spaces. Style: Clean black and white, suitable for printing, educational design.`;
}
