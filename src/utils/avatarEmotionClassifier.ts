/**
 * AVATAR EMOTION CLASSIFIER - 50 Emotions mapped to 30 Video States + Full-Body Support
 * Analyzes AI response text and user input for real-time emotion detection.
 * Each of the original 30 emotions has its own dedicated video loop.
 * 20 additional emotions are mapped to the nearest matching video.
 */

// 8 core emotion families (for audio cues & color grouping)
export type AvatarCoreEmotion = 'idle' | 'happy' | 'sad' | 'crying' | 'angry' | 'surprised' | 'loving' | 'thinking';

// 30 emotions with dedicated video files
export type AvatarVideoEmotion =
  | 'idle'
  | 'happy' | 'joyful' | 'excited' | 'playful' | 'proud' | 'grateful'
  | 'sad' | 'melancholic' | 'lonely' | 'disappointed' | 'nostalgic'
  | 'crying' | 'heartbroken' | 'grieving'
  | 'angry' | 'frustrated' | 'jealous' | 'annoyed'
  | 'surprised' | 'amazed' | 'confused' | 'curious'
  | 'loving' | 'romantic' | 'caring' | 'flirty'
  | 'thinking' | 'contemplative' | 'focused';

// 50 total emotions: 30 with videos + 20 additional mapped to nearest video
export type AvatarEmotionState =
  | AvatarVideoEmotion
  // Additional human emotions (mapped to nearest video)
  | 'anxious' | 'nervous' | 'shy' | 'embarrassed'
  | 'disgusted' | 'bored' | 'impatient' | 'skeptical'
  | 'hopeful' | 'relieved' | 'content' | 'peaceful'
  | 'confident' | 'determined' | 'inspired'
  | 'overwhelmed' | 'vulnerable' | 'sympathetic'
  | 'sarcastic' | 'tender';

// Canonical list of all 50 supported avatar emotions
export const ALL_AVATAR_EMOTIONS: AvatarEmotionState[] = [
  'idle',
  'happy', 'joyful', 'excited', 'playful', 'proud', 'grateful',
  'sad', 'melancholic', 'lonely', 'disappointed', 'nostalgic',
  'crying', 'heartbroken', 'grieving',
  'angry', 'frustrated', 'jealous', 'annoyed',
  'surprised', 'amazed', 'confused', 'curious',
  'loving', 'romantic', 'caring', 'flirty',
  'thinking', 'contemplative', 'focused',
  'anxious', 'nervous', 'shy', 'embarrassed',
  'disgusted', 'bored', 'impatient', 'skeptical',
  'hopeful', 'relieved', 'content', 'peaceful',
  'confident', 'determined', 'inspired',
  'overwhelmed', 'vulnerable', 'sympathetic',
  'sarcastic', 'tender',
];

// Map all 50 emotions → video file name (the 30 that have dedicated videos)
const EMOTION_TO_VIDEO: Record<AvatarEmotionState, AvatarVideoEmotion> = {
  // Direct 1:1 mappings (have their own video)
  idle: 'idle',
  happy: 'happy', joyful: 'joyful', excited: 'excited', playful: 'playful', proud: 'proud', grateful: 'grateful',
  sad: 'sad', melancholic: 'melancholic', lonely: 'lonely', disappointed: 'disappointed', nostalgic: 'nostalgic',
  crying: 'crying', heartbroken: 'heartbroken', grieving: 'grieving',
  angry: 'angry', frustrated: 'frustrated', jealous: 'jealous', annoyed: 'annoyed',
  surprised: 'surprised', amazed: 'amazed', confused: 'confused', curious: 'curious',
  loving: 'loving', romantic: 'romantic', caring: 'caring', flirty: 'flirty',
  thinking: 'thinking', contemplative: 'contemplative', focused: 'focused',

  // New emotions → nearest matching video
  anxious: 'confused',         // anxiety shows as confused/worried look
  nervous: 'confused',         // nervousness similar visual to confusion
  shy: 'caring',               // shy shares gentle/soft expression
  embarrassed: 'confused',     // embarrassment shows awkward confusion
  disgusted: 'annoyed',        // disgust closest to annoyed expression
  bored: 'disappointed',       // boredom similar to disappointment
  impatient: 'frustrated',     // impatience closest to frustration
  skeptical: 'curious',        // skepticism has similar raised-brow look
  hopeful: 'grateful',         // hope shares uplifted grateful expression
  relieved: 'grateful',        // relief closest to grateful sigh
  content: 'happy',            // contentment is gentle happiness
  peaceful: 'contemplative',   // peace matches contemplative calm
  confident: 'proud',          // confidence shares proud expression
  determined: 'focused',       // determination matches focused intensity
  inspired: 'amazed',          // inspiration shares the wonder of amazement
  overwhelmed: 'crying',       // being overwhelmed can look teary
  vulnerable: 'sad',           // vulnerability shows as gentle sadness
  sympathetic: 'caring',       // sympathy matches caring expression
  sarcastic: 'flirty',         // sarcasm shares the smirk/side-eye of flirty
  tender: 'romantic',          // tenderness matches romantic softness
};

// Map all 50 emotions → 8 core families (for audio cues & colors)
const EMOTION_TO_CORE: Record<AvatarEmotionState, AvatarCoreEmotion> = {
  idle: 'idle',
  // Happy family
  happy: 'happy', joyful: 'happy', excited: 'happy', playful: 'happy', proud: 'happy', grateful: 'happy',
  content: 'happy', confident: 'happy', relieved: 'happy', hopeful: 'happy',
  // Sad family
  sad: 'sad', melancholic: 'sad', lonely: 'sad', disappointed: 'sad', nostalgic: 'sad',
  vulnerable: 'sad', bored: 'sad',
  // Crying family
  crying: 'crying', heartbroken: 'crying', grieving: 'crying', overwhelmed: 'crying',
  // Angry family
  angry: 'angry', frustrated: 'angry', jealous: 'angry', annoyed: 'angry',
  disgusted: 'angry', impatient: 'angry',
  // Surprised family
  surprised: 'surprised', amazed: 'surprised', confused: 'surprised', curious: 'surprised',
  skeptical: 'surprised', inspired: 'surprised',
  // Loving family
  loving: 'loving', romantic: 'loving', caring: 'loving', flirty: 'loving',
  shy: 'loving', tender: 'loving', sympathetic: 'loving',
  // Thinking family
  thinking: 'thinking', contemplative: 'thinking', focused: 'thinking',
  peaceful: 'thinking', determined: 'thinking',
  // Anxious maps to thinking (internal state)
  anxious: 'thinking', nervous: 'thinking',
  embarrassed: 'surprised', sarcastic: 'happy',
};

// Pattern definitions for all 50 emotions (sorted by priority descending)
const EMOTION_PATTERNS: { emotion: AvatarEmotionState; pattern: RegExp; priority: number }[] = [
  // Crying group (highest priority)
  { emotion: 'grieving', pattern: /\b(grief|mourn|passed away|lost .*(mom|dad|friend|pet|loved))\b/i, priority: 100 },
  { emotion: 'heartbroken', pattern: /\b(heartbreak|heartbroken|devastat|shattered|broken heart|💔💔)\b/i, priority: 99 },
  { emotion: 'crying', pattern: /\b(cry|crying|tears|sobbing|weeping|😭|bawling)\b/i, priority: 98 },
  { emotion: 'overwhelmed', pattern: /\b(overwhelm|too much|can't handle|breaking down|falling apart)\b/i, priority: 97 },

  // Angry group
  { emotion: 'angry', pattern: /\b(angry|furious|rage|hate|livid|seething|🤬|😡)\b/i, priority: 90 },
  { emotion: 'disgusted', pattern: /\b(disgust|gross|revolting|repulsive|eww|🤮|🤢|nasty|vile)\b/i, priority: 89 },
  { emotion: 'frustrated', pattern: /\b(frustrat|ugh|annoying|fed up|sick of|tired of|can't stand)\b/i, priority: 85 },
  { emotion: 'jealous', pattern: /\b(jealous|envy|envious|why (them|her|him|not me))\b/i, priority: 84 },
  { emotion: 'annoyed', pattern: /\b(annoy|irritat|bother|pissed|miffed|🙄)\b/i, priority: 83 },
  { emotion: 'impatient', pattern: /\b(impatient|hurry up|taking too long|waiting|come on already|how long)\b/i, priority: 82 },

  // Sad group
  { emotion: 'sad', pattern: /\b(sad|unhappy|down|blue|😢|😞|feeling low|depressed)\b/i, priority: 75 },
  { emotion: 'melancholic', pattern: /\b(melanchol|wistful|bittersweet|heavy heart|sigh)\b/i, priority: 74 },
  { emotion: 'lonely', pattern: /\b(lonely|alone|isolated|no one|nobody|miss you|miss them)\b/i, priority: 73 },
  { emotion: 'disappointed', pattern: /\b(disappoint|let down|expected more|hoped for|unfortunately)\b/i, priority: 72 },
  { emotion: 'nostalgic', pattern: /\b(nostalg|remember when|old times|used to|miss those|good old)\b/i, priority: 71 },
  { emotion: 'vulnerable', pattern: /\b(vulnerab|exposed|fragile|defenseless|open up|bare my soul)\b/i, priority: 70 },
  { emotion: 'bored', pattern: /\b(bored|boring|dull|nothing to do|meh|whatever|yawn)\b/i, priority: 69 },

  // Loving group
  { emotion: 'romantic', pattern: /\b(love you|in love|kiss|romance|romantic|darling|sweetheart|💕|💗|💘)\b/i, priority: 68 },
  { emotion: 'flirty', pattern: /\b(flirt|wink|cute|hottie|handsome|beautiful|gorgeous|😘|😏|😉)\b/i, priority: 67 },
  { emotion: 'tender', pattern: /\b(tender|gentle|soft|delicate|sweet moment|precious)\b/i, priority: 66 },
  { emotion: 'loving', pattern: /\b(love|adore|cherish|treasure|dear|warmth|affection|❤️|🥰|💛)\b/i, priority: 65 },
  { emotion: 'caring', pattern: /\b(care|concern|worry about|hope you're ok|take care|here for you|hug|🤗)\b/i, priority: 64 },
  { emotion: 'sympathetic', pattern: /\b(sympath|empathy|feel for you|understand your pain|sorry to hear|poor thing)\b/i, priority: 63 },
  { emotion: 'shy', pattern: /\b(shy|blush|timid|quiet|reserved|introverted|🫣|😊)\b/i, priority: 62 },

  // Surprised group
  { emotion: 'amazed', pattern: /\b(amaz|incredible|unbelievable|mind.?blown|wow|🤯|insane|spectacular)\b/i, priority: 60 },
  { emotion: 'surprised', pattern: /\b(surpris|shock|unexpected|didn't expect|oh my|omg|😲|😮|whoa)\b/i, priority: 59 },
  { emotion: 'confused', pattern: /\b(confus|don't understand|what do you mean|huh|wait what|🤔|lost me)\b/i, priority: 58 },
  { emotion: 'curious', pattern: /\b(curious|wonder|tell me more|interesting|how does|why does|what if)\b/i, priority: 57 },
  { emotion: 'skeptical', pattern: /\b(skeptic|doubt|really\?|hard to believe|not sure|suspicious|hmm)\b/i, priority: 56 },
  { emotion: 'embarrassed', pattern: /\b(embarrass|awkward|cringe|shame|humiliat|mortif|face.?palm|🫠)\b/i, priority: 55.5 },

  // Happy group
  { emotion: 'excited', pattern: /\b(excit|can't wait|pumped|thrilled|stoked|hyped|🎉|🔥|let's go)\b/i, priority: 55 },
  { emotion: 'joyful', pattern: /\b(joy|elated|ecstatic|overjoyed|bliss|euphori|on cloud)\b/i, priority: 54 },
  { emotion: 'proud', pattern: /\b(proud|accomplished|nailed it|crushed it|achievement|did it|made it)\b/i, priority: 53 },
  { emotion: 'confident', pattern: /\b(confident|self.?assured|bold|fearless|unstoppable|got this|bring it)\b/i, priority: 52.5 },
  { emotion: 'grateful', pattern: /\b(grateful|thankful|appreciate|thanks|thank you|blessed|🙏)\b/i, priority: 52 },
  { emotion: 'relieved', pattern: /\b(reliev|relief|finally|weight off|dodged|survived|phew|safe now)\b/i, priority: 51.5 },
  { emotion: 'hopeful', pattern: /\b(hope|hoping|optimist|looking forward|bright side|silver lining|🌟)\b/i, priority: 51.3 },
  { emotion: 'content', pattern: /\b(content|satisfied|at peace|good enough|all good|not bad|fine with)\b/i, priority: 51.1 },
  { emotion: 'playful', pattern: /\b(playful|silly|haha|lol|lmao|funny|joke|😂|🤣|tease)\b/i, priority: 51 },
  { emotion: 'sarcastic', pattern: /\b(sarcas|yeah right|sure thing|totally|oh wow|how original|as if)\b/i, priority: 50.5 },
  { emotion: 'happy', pattern: /\b(happy|glad|great|awesome|wonderful|fantastic|brilliant|perfect|yay|😊|😄)\b/i, priority: 50 },
  { emotion: 'inspired', pattern: /\b(inspir|motivated|fired up|vision|purpose|called to|meant to)\b/i, priority: 49 },

  // Thinking group
  { emotion: 'contemplative', pattern: /\b(contemplat|ponder|reflect|philosophy|meaning of|existential)\b/i, priority: 45 },
  { emotion: 'focused', pattern: /\b(focus|concentrat|working on|deep work|productive|in the zone)\b/i, priority: 44 },
  { emotion: 'determined', pattern: /\b(determin|resolv|commit|no matter what|will not stop|push through|persist)\b/i, priority: 43.5 },
  { emotion: 'peaceful', pattern: /\b(peace|calm|serene|tranquil|zen|meditat|stillness|quiet mind|🧘)\b/i, priority: 43.3 },
  { emotion: 'thinking', pattern: /\b(think|thought|consider|hmm|let me|maybe|perhaps|wondering)\b/i, priority: 43 },
  { emotion: 'anxious', pattern: /\b(anxious|anxiety|worried|panic|dread|scared|fear|nervous wreck|😰)\b/i, priority: 42 },
  { emotion: 'nervous', pattern: /\b(nervous|jitter|butterflies|on edge|tense|uneasy|sweating)\b/i, priority: 41 },
];

/**
 * Classify the emotion of text into one of 50 granular states.
 */
export function classifyAvatarEmotion(text: string): AvatarEmotionState {
  if (!text || text.trim().length === 0) return 'idle';

  const lower = text.toLowerCase();
  let bestMatch: AvatarEmotionState = 'idle';
  let bestPriority = -1;

  for (const { emotion, pattern, priority } of EMOTION_PATTERNS) {
    if (priority > bestPriority && pattern.test(lower)) {
      bestMatch = emotion;
      bestPriority = priority;
    }
  }

  return bestMatch;
}

/**
 * Get the core emotion family (for audio cues & color grouping).
 */
export function getCoreEmotion(emotion: AvatarEmotionState): AvatarCoreEmotion {
  return EMOTION_TO_CORE[emotion] || 'idle';
}

/**
 * Get the video file emotion key. Each of the 30 original emotions has its own video.
 * The 20 new emotions map to the nearest matching video.
 */
export function getVideoEmotion(emotion: AvatarEmotionState): AvatarVideoEmotion {
  return EMOTION_TO_VIDEO[emotion] || 'idle';
}

/**
 * Map emotion state to a video source URL.
 * Now uses per-emotion videos instead of just 8 core videos.
 */
export function getEmotionVideoUrl(emotion: AvatarEmotionState, variant: 'zoe' | 'smith' = 'zoe'): string {
  const videoEmotion = getVideoEmotion(emotion);
  return `/videos/avatar-${variant}-${videoEmotion}.mp4`;
}

/**
 * Get a human-readable label for the emotion pill indicator.
 */
export function getEmotionLabel(emotion: AvatarEmotionState): string {
  const labels: Partial<Record<AvatarEmotionState, string>> = {
    anxious: 'Anxious', nervous: 'Nervous', shy: 'Shy', embarrassed: 'Embarrassed',
    disgusted: 'Disgusted', bored: 'Bored', impatient: 'Impatient', skeptical: 'Skeptical',
    hopeful: 'Hopeful', relieved: 'Relieved', content: 'Content', peaceful: 'Peaceful',
    confident: 'Confident', determined: 'Determined', inspired: 'Inspired',
    overwhelmed: 'Overwhelmed', vulnerable: 'Vulnerable', sympathetic: 'Sympathetic',
    sarcastic: 'Sarcastic', tender: 'Tender',
  };
  return labels[emotion] || emotion.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get the color scheme for an emotion indicator.
 * Extended palette for new emotions.
 */
export function getEmotionColor(emotion: AvatarEmotionState): { bg: string; border: string; text: string } {
  // Check for specific new emotion colors first
  const specificColors: Partial<Record<AvatarEmotionState, { bg: string; border: string; text: string }>> = {
    anxious:      { bg: 'rgba(180,120,255,0.15)', border: 'rgba(180,120,255,0.3)', text: 'rgba(200,150,255,0.9)' },
    nervous:      { bg: 'rgba(180,120,255,0.15)', border: 'rgba(180,120,255,0.3)', text: 'rgba(200,150,255,0.9)' },
    shy:          { bg: 'rgba(255,180,200,0.15)', border: 'rgba(255,180,200,0.3)', text: 'rgba(255,200,220,0.9)' },
    embarrassed:  { bg: 'rgba(255,130,130,0.15)', border: 'rgba(255,130,130,0.3)', text: 'rgba(255,160,160,0.9)' },
    disgusted:    { bg: 'rgba(100,180,60,0.15)',  border: 'rgba(100,180,60,0.3)',  text: 'rgba(140,200,80,0.9)' },
    bored:        { bg: 'rgba(150,150,150,0.15)', border: 'rgba(150,150,150,0.3)', text: 'rgba(180,180,180,0.9)' },
    impatient:    { bg: 'rgba(255,150,50,0.15)',  border: 'rgba(255,150,50,0.3)',  text: 'rgba(255,180,80,0.9)' },
    skeptical:    { bg: 'rgba(200,180,100,0.15)', border: 'rgba(200,180,100,0.3)', text: 'rgba(220,200,120,0.9)' },
    hopeful:      { bg: 'rgba(100,220,180,0.15)', border: 'rgba(100,220,180,0.3)', text: 'rgba(130,240,200,0.9)' },
    relieved:     { bg: 'rgba(80,200,150,0.15)',  border: 'rgba(80,200,150,0.3)',  text: 'rgba(110,220,180,0.9)' },
    content:      { bg: 'rgba(150,220,100,0.15)', border: 'rgba(150,220,100,0.3)', text: 'rgba(180,240,130,0.9)' },
    peaceful:     { bg: 'rgba(120,180,220,0.15)', border: 'rgba(120,180,220,0.3)', text: 'rgba(150,200,240,0.9)' },
    confident:    { bg: 'rgba(255,180,0,0.15)',   border: 'rgba(255,180,0,0.3)',   text: 'rgba(255,200,50,0.9)' },
    determined:   { bg: 'rgba(220,100,50,0.15)',  border: 'rgba(220,100,50,0.3)',  text: 'rgba(240,130,80,0.9)' },
    inspired:     { bg: 'rgba(255,220,100,0.15)', border: 'rgba(255,220,100,0.3)', text: 'rgba(255,240,130,0.9)' },
    overwhelmed:  { bg: 'rgba(200,80,200,0.15)',  border: 'rgba(200,80,200,0.3)',  text: 'rgba(220,120,220,0.9)' },
    vulnerable:   { bg: 'rgba(180,150,200,0.15)', border: 'rgba(180,150,200,0.3)', text: 'rgba(200,180,220,0.9)' },
    sympathetic:  { bg: 'rgba(200,160,220,0.15)', border: 'rgba(200,160,220,0.3)', text: 'rgba(220,180,240,0.9)' },
    sarcastic:    { bg: 'rgba(180,200,80,0.15)',  border: 'rgba(180,200,80,0.3)',  text: 'rgba(200,220,100,0.9)' },
    tender:       { bg: 'rgba(255,180,200,0.15)', border: 'rgba(255,180,200,0.3)', text: 'rgba(255,200,220,0.9)' },
  };

  if (specificColors[emotion]) return specificColors[emotion]!;

  // Fallback to core emotion colors
  const core = getCoreEmotion(emotion);
  switch (core) {
    case 'happy':    return { bg: 'rgba(0,255,100,0.15)', border: 'rgba(0,255,100,0.3)', text: 'rgba(0,255,100,0.9)' };
    case 'sad':      return { bg: 'rgba(100,100,255,0.15)', border: 'rgba(100,100,255,0.3)', text: 'rgba(150,150,255,0.9)' };
    case 'crying':   return { bg: 'rgba(255,100,100,0.15)', border: 'rgba(255,100,100,0.3)', text: 'rgba(255,150,150,0.9)' };
    case 'angry':    return { bg: 'rgba(255,60,60,0.15)', border: 'rgba(255,60,60,0.3)', text: 'rgba(255,100,80,0.9)' };
    case 'surprised':return { bg: 'rgba(255,200,0,0.15)', border: 'rgba(255,200,0,0.3)', text: 'rgba(255,220,50,0.9)' };
    case 'loving':   return { bg: 'rgba(255,100,200,0.15)', border: 'rgba(255,100,200,0.3)', text: 'rgba(255,150,220,0.9)' };
    case 'thinking': return { bg: 'rgba(150,200,255,0.15)', border: 'rgba(150,200,255,0.3)', text: 'rgba(180,220,255,0.9)' };
    default:         return { bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.7)' };
  }
}

/**
 * Get the total count of supported emotions.
 */
export function getEmotionCount(): number {
  return ALL_AVATAR_EMOTIONS.length;
}
