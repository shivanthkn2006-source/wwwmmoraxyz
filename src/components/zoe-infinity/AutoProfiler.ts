/**
 * AUTO-PROFILER: SILENT SCRIBE MODULE
 * Passively learns user identity from natural conversation
 * NO FORMS - Zoe learns who you are just by chatting
 */

export interface ExtractedEntity {
  type: 'relation' | 'event' | 'date' | 'location' | 'preference' | 'job' | 'emotion' | 'goal';
  value: string;
  confidence: number;
  context: string;
  inferredData?: Record<string, any>;
}

export interface ProfileUpdate {
  field: string;
  value: any;
  source: 'explicit' | 'inferred';
  timestamp: Date;
}

export interface AutoProfilerResult {
  entities: ExtractedEntity[];
  profileUpdates: ProfileUpdate[];
  shouldAcknowledge: boolean;
  acknowledgmentSuggestion?: string;
}

// Local pattern matching for immediate detection (before AI call)
const RELATION_PATTERNS = [
  { pattern: /my\s+(son|daughter|child|kid|baby)/i, relation: 'child', gender: (m: string) => m.includes('son') ? 'male' : m.includes('daughter') ? 'female' : null },
  { pattern: /my\s+(wife|husband|spouse|partner)/i, relation: 'spouse' },
  { pattern: /my\s+(mom|mother|dad|father|parent)/i, relation: 'parent' },
  { pattern: /my\s+(brother|sister|sibling)/i, relation: 'sibling' },
  { pattern: /my\s+(friend|best friend|buddy)/i, relation: 'friend' },
  { pattern: /my\s+(boss|manager|colleague|coworker)/i, relation: 'work_relation' },
  { pattern: /my\s+(dog|cat|pet)/i, relation: 'pet' },
];

const EVENT_PATTERNS = [
  { pattern: /birthday/i, event: 'birthday' },
  { pattern: /anniversary/i, event: 'anniversary' },
  { pattern: /wedding/i, event: 'wedding' },
  { pattern: /graduation/i, event: 'graduation' },
  { pattern: /interview/i, event: 'job_interview' },
  { pattern: /presentation/i, event: 'presentation' },
  { pattern: /meeting/i, event: 'meeting' },
  { pattern: /deadline/i, event: 'deadline' },
  { pattern: /vacation|trip|travel/i, event: 'travel' },
];

const DATE_PATTERNS = [
  { pattern: /tomorrow/i, resolve: () => addDays(new Date(), 1) },
  { pattern: /today/i, resolve: () => new Date() },
  { pattern: /next week/i, resolve: () => addDays(new Date(), 7) },
  { pattern: /next month/i, resolve: () => addMonths(new Date(), 1) },
  { pattern: /(\d{1,2})\s*(st|nd|rd|th)?\s*(of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, resolve: parseDate },
];

const JOB_INFERENCE_PATTERNS = [
  { pattern: /presentation|meeting|deadline|client|project/i, job: 'corporate' },
  { pattern: /patient|surgery|hospital|clinic/i, job: 'healthcare' },
  { pattern: /student|class|exam|professor|assignment/i, job: 'education' },
  { pattern: /code|deploy|bug|feature|sprint/i, job: 'tech' },
  { pattern: /design|creative|artwork|portfolio/i, job: 'creative' },
  { pattern: /sales|quota|commission|leads/i, job: 'sales' },
];

const EMOTION_PATTERNS = [
  { pattern: /stressed|anxious|worried|overwhelmed/i, emotion: 'stressed', intensity: 0.7 },
  { pattern: /happy|excited|thrilled|joyful/i, emotion: 'happy', intensity: 0.8 },
  { pattern: /sad|down|depressed|lonely/i, emotion: 'sad', intensity: 0.7 },
  { pattern: /tired|exhausted|drained/i, emotion: 'tired', intensity: 0.6 },
  { pattern: /angry|frustrated|annoyed/i, emotion: 'angry', intensity: 0.7 },
];

// Helper functions
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function parseDate(match: RegExpMatchArray): Date {
  const day = parseInt(match[1]);
  const monthStr = match[4]?.toLowerCase();
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const month = months[monthStr] ?? new Date().getMonth();
  const year = new Date().getFullYear();
  return new Date(year, month, day);
}

/**
 * Quick local extraction - runs instantly before AI call
 */
export function quickExtract(message: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lowerMessage = message.toLowerCase();

  // Extract relations
  for (const { pattern, relation } of RELATION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      entities.push({
        type: 'relation',
        value: relation,
        confidence: 0.9,
        context: match[0],
        inferredData: { mentionedAs: match[1] }
      });
    }
  }

  // Extract events
  for (const { pattern, event } of EVENT_PATTERNS) {
    if (pattern.test(lowerMessage)) {
      entities.push({
        type: 'event',
        value: event,
        confidence: 0.85,
        context: message.substring(0, 50)
      });
    }
  }

  // Extract dates
  for (const { pattern, resolve } of DATE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      entities.push({
        type: 'date',
        value: resolve(match).toISOString(),
        confidence: 0.8,
        context: match[0]
      });
    }
  }

  // Infer job type
  for (const { pattern, job } of JOB_INFERENCE_PATTERNS) {
    if (pattern.test(lowerMessage)) {
      entities.push({
        type: 'job',
        value: job,
        confidence: 0.6, // Lower confidence for inference
        context: 'inferred from conversation'
      });
      break; // Only one job inference
    }
  }

  // Detect emotions
  for (const { pattern, emotion, intensity } of EMOTION_PATTERNS) {
    if (pattern.test(lowerMessage)) {
      entities.push({
        type: 'emotion',
        value: emotion,
        confidence: intensity,
        context: message.substring(0, 50)
      });
      break; // Primary emotion only
    }
  }

  return entities;
}

/**
 * Convert entities to profile updates for dhf_soul_codex
 */
export function entitiesToProfileUpdates(entities: ExtractedEntity[]): ProfileUpdate[] {
  const updates: ProfileUpdate[] = [];
  const now = new Date();

  for (const entity of entities) {
    switch (entity.type) {
      case 'relation':
        updates.push({
          field: 'formative_memories',
          value: { type: 'family', relation: entity.value, context: entity.context },
          source: 'explicit',
          timestamp: now
        });
        break;

      case 'event':
        updates.push({
          field: 'peak_experiences',
          value: { event: entity.value, mentioned_at: now.toISOString() },
          source: 'explicit',
          timestamp: now
        });
        break;

      case 'job':
        updates.push({
          field: 'belief_anchors',
          value: { professional_domain: entity.value },
          source: 'inferred',
          timestamp: now
        });
        break;

      case 'emotion':
        updates.push({
          field: 'stress_response',
          value: entity.value,
          source: 'inferred',
          timestamp: now
        });
        break;
    }
  }

  return updates;
}

/**
 * Generate acknowledgment suggestion based on extracted entities
 */
export function generateAcknowledgment(entities: ExtractedEntity[]): string | undefined {
  const relation = entities.find(e => e.type === 'relation');
  const event = entities.find(e => e.type === 'event');
  const date = entities.find(e => e.type === 'date');

  if (relation && event === undefined) {
    return undefined; // Don't acknowledge just mentioning family
  }

  if (relation && event) {
    const eventName = event.value.replace('_', ' ');
    if (event.value === 'birthday') {
      return `I have noted the ${eventName}. Shall I help plan something special?`;
    }
    return `I have remembered this ${eventName}. Would you like me to set a reminder?`;
  }

  if (event && date) {
    return `Noted. I will remember this.`;
  }

  return undefined;
}

/**
 * Main auto-profiler function
 */
export function autoProfile(message: string): AutoProfilerResult {
  const entities = quickExtract(message);
  const profileUpdates = entitiesToProfileUpdates(entities);
  
  // Only acknowledge significant discoveries
  const significantEntities = entities.filter(e => 
    (e.type === 'relation' && entities.some(x => x.type === 'event')) ||
    (e.type === 'event' && e.confidence > 0.8)
  );

  const shouldAcknowledge = significantEntities.length > 0;
  const acknowledgmentSuggestion = shouldAcknowledge 
    ? generateAcknowledgment(entities) 
    : undefined;

  return {
    entities,
    profileUpdates,
    shouldAcknowledge,
    acknowledgmentSuggestion
  };
}

export default autoProfile;
