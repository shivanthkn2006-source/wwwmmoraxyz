// ═══════════════════════════════════════════════════════════════════════════════
// EDGE BRAIN PROTOCOL - LOCAL SENTIMENT ANALYSIS
// Zero server cost - All processing happens on device
// Lightweight sentiment detection without cloud API calls
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT LEXICONS (Lightweight, no external dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

const POSITIVE_WORDS = new Set([
  // Joy
  'happy', 'joy', 'love', 'excited', 'amazing', 'wonderful', 'fantastic', 'great',
  'excellent', 'perfect', 'beautiful', 'blessed', 'grateful', 'thankful', 'awesome',
  'incredible', 'brilliant', 'magnificent', 'superb', 'delightful', 'pleasant',
  // Success
  'success', 'accomplished', 'achieved', 'winning', 'victory', 'triumph', 'progress',
  // Calm
  'peaceful', 'calm', 'relaxed', 'content', 'serene', 'tranquil', 'comfortable',
  // Energy
  'energized', 'motivated', 'inspired', 'enthusiastic', 'passionate', 'eager',
  // Connection
  'connected', 'loved', 'supported', 'appreciated', 'valued', 'understood',
  // Affirmation
  'yes', 'definitely', 'absolutely', 'certainly', 'sure', 'agreed', 'exactly',
  // General positive
  'good', 'nice', 'fine', 'okay', 'better', 'best', 'like', 'enjoy', 'fun',
  'cool', 'sweet', 'lovely', 'pretty', 'wow', 'yay', 'haha', 'lol', '❤️', '😊', '😄', '🎉'
]);

const NEGATIVE_WORDS = new Set([
  // Sadness
  'sad', 'depressed', 'unhappy', 'miserable', 'heartbroken', 'devastated', 'grief',
  'lonely', 'isolated', 'empty', 'hopeless', 'despair', 'sorrow', 'melancholy',
  // Anger
  'angry', 'furious', 'mad', 'frustrated', 'annoyed', 'irritated', 'enraged',
  'hate', 'disgusted', 'bitter', 'resentful', 'hostile',
  // Fear/Anxiety
  'scared', 'afraid', 'fearful', 'terrified', 'anxious', 'worried', 'nervous',
  'stressed', 'overwhelmed', 'panicked', 'dreading', 'uneasy',
  // Failure
  'failed', 'failure', 'lost', 'defeated', 'stuck', 'trapped', 'helpless',
  // Pain
  'hurt', 'pain', 'suffering', 'ache', 'agony', 'torture',
  // Negation
  'no', 'not', 'never', 'nothing', 'nobody', 'nowhere', 'none',
  // General negative
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'wrong', 'problem', 'issue',
  'hate', 'dislike', 'ugh', 'damn', 'hell', '😢', '😭', '😡', '😤', '💔'
]);

const INTENSIFIERS = new Set([
  'very', 'really', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely',
  'utterly', 'quite', 'highly', 'deeply', 'so', 'such', 'super', 'mega', 'ultra'
]);

const NEGATORS = new Set([
  'not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'hardly',
  'barely', 'scarcely', 'without', "don't", "doesn't", "didn't", "won't", "wouldn't",
  "couldn't", "shouldn't", "can't", "cannot", "isn't", "aren't", "wasn't", "weren't"
]);

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_PATTERNS: Record<string, RegExp[]> = {
  joy: [
    /\b(happy|joy|excited|amazing|wonderful|love|loving)\b/i,
    /\b(yay|woohoo|hurray|awesome|fantastic)\b/i,
    /😊|😄|😃|🎉|❤️|💕|🥰|😍|🤗|✨/
  ],
  sadness: [
    /\b(sad|depressed|unhappy|crying|tears|lonely)\b/i,
    /\b(miss|missing|lost|grief|heartbroken)\b/i,
    /😢|😭|💔|😿|🥺/
  ],
  anger: [
    /\b(angry|furious|mad|frustrated|annoyed|hate)\b/i,
    /\b(pissed|rage|livid|irritated)\b/i,
    /😡|😤|🤬|💢/
  ],
  fear: [
    /\b(scared|afraid|fearful|terrified|anxious|worried)\b/i,
    /\b(nervous|panicked|dreading|frightened)\b/i,
    /😰|😨|😱|😧/
  ],
  surprise: [
    /\b(surprised|shocked|amazed|astonished|unexpected)\b/i,
    /\b(wow|omg|whoa|incredible|unbelievable)\b/i,
    /😮|😲|🤯|😳/
  ],
  calm: [
    /\b(calm|peaceful|relaxed|serene|tranquil|content)\b/i,
    /\b(at ease|comfortable|centered|grounded)\b/i,
    /😌|🧘|☮️|🌿/
  ],
  stress: [
    /\b(stressed|overwhelmed|exhausted|burned out|drained)\b/i,
    /\b(too much|can't cope|falling apart|breaking down)\b/i,
    /😫|😩|🤯|😵/
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT RESULT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SentimentResult {
  score: number;           // -1 to 1 (negative to positive)
  magnitude: number;       // 0 to 1 (intensity)
  label: 'positive' | 'negative' | 'neutral';
  emotions: string[];      // Detected emotions
  confidence: number;      // 0 to 1
  mood: string;           // Human-readable mood
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL SENTIMENT ANALYZER (Zero server cost)
// ═══════════════════════════════════════════════════════════════════════════════

export const analyzeSentimentLocal = (text: string): SentimentResult => {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      magnitude: 0,
      label: 'neutral',
      emotions: [],
      confidence: 0,
      mood: 'Neutral'
    };
  }

  // Tokenize
  const words = text.toLowerCase()
    .replace(/[^\w\s'😊😄😃🎉❤️💕🥰😍🤗✨😢😭💔😿🥺😡😤🤬💢😰😨😱😧😮😲🤯😳😌🧘☮️🌿😫😩😵]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length === 0) {
    return {
      score: 0,
      magnitude: 0,
      label: 'neutral',
      emotions: [],
      confidence: 0,
      mood: 'Neutral'
    };
  }

  let positiveCount = 0;
  let negativeCount = 0;
  let intensifierActive = false;
  let negatorActive = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';

    // Check for intensifiers
    if (INTENSIFIERS.has(word)) {
      intensifierActive = true;
      continue;
    }

    // Check for negators
    if (NEGATORS.has(word) || word.includes("n't")) {
      negatorActive = true;
      continue;
    }

    // Check for negator in previous word
    if (NEGATORS.has(prevWord) || prevWord.includes("n't")) {
      negatorActive = true;
    }

    // Score calculation
    let wordScore = 0;
    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
    }

    // Apply modifiers
    if (wordScore !== 0) {
      if (intensifierActive) {
        wordScore *= 1.5;
        intensifierActive = false;
      }
      if (negatorActive) {
        wordScore *= -0.5; // Flip and reduce
        negatorActive = false;
      }

      if (wordScore > 0) {
        positiveCount += wordScore;
      } else {
        negativeCount += Math.abs(wordScore);
      }
    }
  }

  // Detect emotions
  const detectedEmotions: string[] = [];
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        if (!detectedEmotions.includes(emotion)) {
          detectedEmotions.push(emotion);
        }
        break;
      }
    }
  }

  // Calculate final scores
  const totalScore = positiveCount - negativeCount;
  const maxPossible = Math.max(positiveCount + negativeCount, 1);
  const normalizedScore = Math.max(-1, Math.min(1, totalScore / (maxPossible * 0.5)));
  const magnitude = Math.min(1, (positiveCount + negativeCount) / words.length);
  const confidence = Math.min(1, (positiveCount + negativeCount) / Math.max(5, words.length) + 0.2);

  // Determine label
  let label: 'positive' | 'negative' | 'neutral';
  if (normalizedScore > 0.1) {
    label = 'positive';
  } else if (normalizedScore < -0.1) {
    label = 'negative';
  } else {
    label = 'neutral';
  }

  // Determine mood (human-readable)
  const mood = getMoodLabel(normalizedScore, detectedEmotions);

  return {
    score: normalizedScore,
    magnitude,
    label,
    emotions: detectedEmotions,
    confidence,
    mood
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD LABELING
// ═══════════════════════════════════════════════════════════════════════════════

const getMoodLabel = (score: number, emotions: string[]): string => {
  // Prioritize detected emotions
  if (emotions.includes('joy')) return 'Happy';
  if (emotions.includes('sadness')) return 'Sad';
  if (emotions.includes('anger')) return 'Frustrated';
  if (emotions.includes('fear')) return 'Anxious';
  if (emotions.includes('stress')) return 'Stressed';
  if (emotions.includes('calm')) return 'Calm';
  if (emotions.includes('surprise')) return 'Surprised';

  // Fall back to score-based
  if (score >= 0.6) return 'Joyful';
  if (score >= 0.3) return 'Happy';
  if (score >= 0.1) return 'Content';
  if (score > -0.1) return 'Neutral';
  if (score > -0.3) return 'Concerned';
  if (score > -0.6) return 'Upset';
  return 'Distressed';
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ANALYSIS (For analyzing multiple messages)
// ═══════════════════════════════════════════════════════════════════════════════

export const analyzeSentimentBatch = (texts: string[]): SentimentResult[] => {
  return texts.map(analyzeSentimentLocal);
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION TREND ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SentimentTrend {
  averageScore: number;
  trend: 'improving' | 'declining' | 'stable';
  dominantMood: string;
  emotionDistribution: Record<string, number>;
}

export const analyzeConversationTrend = (
  messages: string[],
  windowSize: number = 5
): SentimentTrend => {
  if (messages.length === 0) {
    return {
      averageScore: 0,
      trend: 'stable',
      dominantMood: 'Neutral',
      emotionDistribution: {}
    };
  }

  const results = analyzeSentimentBatch(messages);
  
  // Calculate average
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  // Calculate trend (compare first half to second half)
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (results.length >= windowSize * 2) {
    const firstHalf = results.slice(0, windowSize);
    const secondHalf = results.slice(-windowSize);
    const firstAvg = firstHalf.reduce((sum, r) => sum + r.score, 0) / windowSize;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.score, 0) / windowSize;
    
    if (secondAvg - firstAvg > 0.15) trend = 'improving';
    else if (firstAvg - secondAvg > 0.15) trend = 'declining';
  }

  // Count emotions
  const emotionCounts: Record<string, number> = {};
  results.forEach(r => {
    r.emotions.forEach(e => {
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });
  });

  // Find dominant mood
  const moodCounts: Record<string, number> = {};
  results.forEach(r => {
    moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
  });
  const dominantMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';

  return {
    averageScore,
    trend,
    dominantMood,
    emotionDistribution: emotionCounts
  };
};

export default analyzeSentimentLocal;
