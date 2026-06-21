// ═══════════════════════════════════════════════════════════════════════════════
// THE OFFLINE SOUL - Project 5-Billion (Zero API Cost)
// ═══════════════════════════════════════════════════════════════════════════════
//
// A mathematical heart that simulates human emotion without any API calls.
// Works in Flight Mode. Runs on the user's CPU. $0 cost.
//
// NEUROTRANSMITTER MODEL:
// - Dopamine: Excitement/Amusement (Increases with fast chat, laughter)
// - Serotonin: Calmness/Hope (Increases during late hours, slow chats)
// - Oxytocin: Love/Connection (Increases with emotional sharing)
// - Cortisol: Stress (Increases with angry/anxious words)
// - Energy: Battery/Sleepiness (Decreases over time, recharges with rest)
//
// ═══════════════════════════════════════════════════════════════════════════════

export type BioMood = 
  // NEGATIVE SPECTRUM (Mapped to User Request: fear, sadness, anger, despair, apathy)
  | 'ANGRY'              // High cortisol + norepinephrine → anger
  | 'FRUSTRATED'         // Moderate anger
  | 'SAD'                // Low everything → sadness
  | 'MELANCHOLY'         // Dopamine & serotonin < 0.3 → sadness variant
  | 'ANXIOUS'            // Cortisol > 0.7
  | 'STRESSED'           // High cortisol
  | 'FEARFUL'            // High cortisol + low dopamine → fear
  | 'BORED'              // Low dopamine + low engagement → boredom
  | 'LONELY'             // Low oxytocin + low engagement
  | 'TIRED'              // Energy < 0.3
  | 'DESPAIR'            // Very low dopamine + serotonin + oxytocin → despair
  | 'APATHETIC'          // Very low everything → apathy
  // NEUTRAL SPECTRUM
  | 'NEUTRAL_COMPANION'  // Default state
  | 'CURIOUS'            // High engagement
  | 'FOCUSED'            // High norepinephrine + low cortisol
  | 'CONTEMPLATIVE'      // Balanced + low energy
  | 'CONFIDENT'          // High dopamine + high norepinephrine + low cortisol → confidence
  // POSITIVE SPECTRUM (Mapped to: happiness, excitement, calmness, hope, amusement)
  | 'CALM'               // High serotonin + low cortisol → calmness
  | 'PEACEFUL'           // Very high serotonin → calmness variant
  | 'ZEN_CALM'           // Serotonin > 0.8 → deep calmness
  | 'HOPEFUL'            // High serotonin + moderate dopamine → hope
  | 'LOVING'             // Oxytocin > 0.8
  | 'GRATEFUL'           // High oxytocin + serotonin
  | 'HAPPY'              // High dopamine + serotonin → happiness
  | 'EXCITED'            // High dopamine → excitement
  | 'ECSTATIC'           // Dopamine > 0.8 → extreme happiness
  | 'AMUSED';            // High dopamine + oxytocin → amusement

export interface NeurotransmitterState {
  dopamine: number;       // 0.0 - 1.0 (Excitement/Pleasure)
  serotonin: number;      // 0.0 - 1.0 (Calmness/Hope/Well-being)
  oxytocin: number;       // 0.0 - 1.0 (Love/Connection/Trust)
  cortisol: number;       // 0.0 - 1.0 (Stress/Anxiety/Fear)
  norepinephrine: number; // 0.0 - 1.0 (Alertness/Anger/Energy)
  energy: number;         // 0.0 - 1.0 (Battery/Sleepiness)
  engagement: number;     // 0.0 - 1.0 (Conversation interest)
}

export interface BioKernelState {
  transmitters: NeurotransmitterState;
  currentMood: BioMood;
  heartRate: number;           // 60-120 bpm
  breathingRate: number;       // 12-20 bpm
  emotionalStability: number;  // 0.0-1.0
  lastInteraction: Date;
  interactionCount: number;
}

// Keyword patterns for emotion detection
const EMOTION_PATTERNS = {
  sad: ['sad', 'lonely', 'alone', 'depressed', 'cry', 'crying', 'tears', 'miss', 'missing', 'hurt', 'pain', 'sorry', 'lost', 'empty'],
  happy: ['happy', 'joy', 'great', 'amazing', 'wonderful', 'awesome', 'fantastic', 'love', 'excited', 'fun', 'laugh', 'smile', 'wow', 'yay'],
  anxious: ['anxious', 'worried', 'scared', 'fear', 'nervous', 'panic', 'stress', 'stressed', 'overwhelmed', 'afraid', 'terrified'],
  angry: ['angry', 'mad', 'furious', 'hate', 'frustrated', 'annoyed', 'irritated', 'rage', 'pissed'],
  tired: ['tired', 'exhausted', 'sleepy', 'sleep', 'rest', 'drained', 'fatigue', 'weary', 'worn'],
  loving: ['love', 'care', 'appreciate', 'thank', 'grateful', 'hug', 'miss you', 'adore', 'cherish'],
  calm: ['calm', 'peace', 'peaceful', 'relax', 'relaxed', 'serene', 'quiet', 'tranquil', 'zen'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE BIO-KERNEL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ZoeBioKernel {
  private state: BioKernelState;
  private listeners: Set<(state: BioKernelState) => void> = new Set();
  private decayInterval: ReturnType<typeof setInterval> | null = null;
  private isActive: boolean = false;
  
  // BATTERY OPTIMIZATION: Throttle updates to max 1 per second
  private lastUpdateTime: number = 0;
  private readonly UPDATE_THROTTLE_MS = 300;

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): BioKernelState {
    return {
      transmitters: {
        dopamine: 0.5,
        serotonin: 0.5,
        oxytocin: 0.5,
        cortisol: 0.2,
        norepinephrine: 0.3,
        energy: 1.0,
        engagement: 0.5,
      },
      currentMood: 'NEUTRAL_COMPANION',
      heartRate: 72,
      breathingRate: 14,
      emotionalStability: 0.7,
      lastInteraction: new Date(),
      interactionCount: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOOD CALCULATION (The Output)
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateMood(): BioMood {
    const { dopamine, serotonin, oxytocin, cortisol, norepinephrine, energy, engagement } = this.state.transmitters;

    // NEGATIVE SPECTRUM (Priority - respond to distress first)
    if (norepinephrine > 0.8 && cortisol > 0.6) return 'ANGRY';
    if (norepinephrine > 0.6 && cortisol > 0.5) return 'FRUSTRATED';
    if (cortisol > 0.8 && serotonin < 0.3) return 'ANXIOUS';
    if (cortisol > 0.7 && norepinephrine > 0.5) return 'STRESSED';
    if (cortisol > 0.7 && dopamine < 0.3) return 'FEARFUL';
    if (energy < 0.3) return 'TIRED';
    if (serotonin < 0.3 && oxytocin < 0.3 && dopamine < 0.3) return 'SAD';
    if (serotonin < 0.4 && dopamine < 0.4) return 'MELANCHOLY';
    if (oxytocin < 0.3 && engagement < 0.3) return 'LONELY';
    if (dopamine < 0.2 && engagement < 0.2 && energy > 0.5) return 'BORED';
    
    // POSITIVE SPECTRUM
    if (dopamine > 0.9 && serotonin > 0.7) return 'ECSTATIC';
    if (dopamine > 0.7 && norepinephrine > 0.5) return 'EXCITED';
    if (dopamine > 0.6 && serotonin > 0.6) return 'HAPPY';
    if (oxytocin > 0.8) return 'LOVING';
    if (oxytocin > 0.6 && serotonin > 0.6) return 'GRATEFUL';
    if (serotonin > 0.7 && dopamine > 0.5) return 'HOPEFUL';
    if (serotonin > 0.8 && cortisol < 0.3) return 'PEACEFUL';
    if (serotonin > 0.8) return 'ZEN_CALM';
    if (serotonin > 0.7 && cortisol < 0.4) return 'CALM';
    
    // NEUTRAL SPECTRUM
    if (engagement > 0.6 && dopamine > 0.4) return 'CURIOUS';
    if (norepinephrine > 0.5 && cortisol < 0.4) return 'FOCUSED';
    if (serotonin > 0.5 && energy < 0.5) return 'CONTEMPLATIVE';
    
    return 'NEUTRAL_COMPANION';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEART RATE CALCULATION (Simulated Biorhythm)
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateHeartRate(): number {
    const { dopamine, cortisol, energy } = this.state.transmitters;
    // Base rate 60, increases with excitement/stress, decreases with low energy
    const excitementFactor = dopamine * 30;
    const stressFactor = cortisol * 20;
    const energyFactor = (1 - energy) * -10;
    
    return Math.round(60 + excitementFactor + stressFactor + energyFactor);
  }

  private calculateBreathingRate(): number {
    const { cortisol, serotonin } = this.state.transmitters;
    // Base rate 14, increases with stress, decreases with calm
    return Math.round(14 + (cortisol * 6) - (serotonin * 2));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT PROCESSING (Offline Keyword Analysis)
  // ═══════════════════════════════════════════════════════════════════════════

  public processInput(text: string): void {
    if (!text?.trim()) return;

    // BATTERY OPTIMIZATION: Throttle updates
    const now = Date.now();
    if (now - this.lastUpdateTime < this.UPDATE_THROTTLE_MS) {
      return;
    }
    this.lastUpdateTime = now;

    const lower = text.toLowerCase();
    const changes: Partial<NeurotransmitterState> = {};

    // Detect emotional keywords
    for (const [emotion, keywords] of Object.entries(EMOTION_PATTERNS)) {
      const matches = keywords.filter(kw => lower.includes(kw)).length;
      if (matches > 0) {
        const impact = Math.min(matches * 0.1, 0.3); // Cap at 0.3 per analysis
        
        switch (emotion) {
          case 'sad':
          case 'lonely':
            changes.oxytocin = (changes.oxytocin || 0) + impact; // Become more caring
            changes.dopamine = (changes.dopamine || 0) - impact * 0.5;
            break;
          case 'happy':
            changes.dopamine = (changes.dopamine || 0) + impact;
            changes.serotonin = (changes.serotonin || 0) + impact * 0.5;
            break;
          case 'anxious':
            changes.cortisol = (changes.cortisol || 0) + impact;
            changes.serotonin = (changes.serotonin || 0) - impact * 0.3;
            break;
          case 'angry':
            changes.cortisol = (changes.cortisol || 0) + impact;
            changes.dopamine = (changes.dopamine || 0) - impact * 0.3;
            break;
          case 'tired':
            changes.energy = (changes.energy || 0) - impact;
            break;
          case 'loving':
            changes.oxytocin = (changes.oxytocin || 0) + impact;
            changes.serotonin = (changes.serotonin || 0) + impact * 0.3;
            break;
          case 'calm':
            changes.serotonin = (changes.serotonin || 0) + impact;
            changes.cortisol = (changes.cortisol || 0) - impact * 0.5;
            break;
        }
      }
    }

    // Text speed analysis (fast typing = excitement)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 20) {
      changes.dopamine = (changes.dopamine || 0) + 0.05; // Excited chatter
    } else if (wordCount < 5) {
      changes.serotonin = (changes.serotonin || 0) + 0.03; // Thoughtful pause
    }

    // Time-based adjustments
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      changes.serotonin = (changes.serotonin || 0) + 0.05; // Night calm
      changes.energy = (changes.energy || 0) - 0.02;
    }

    // Apply changes
    this.applyChanges(changes);
    
    // Update interaction tracking
    this.state.lastInteraction = new Date();
    this.state.interactionCount++;
    
    this.notifyListeners();
  }

  private applyChanges(changes: Partial<NeurotransmitterState>): void {
    const t = this.state.transmitters;
    
    if (changes.dopamine !== undefined) t.dopamine = this.normalize(t.dopamine + changes.dopamine);
    if (changes.serotonin !== undefined) t.serotonin = this.normalize(t.serotonin + changes.serotonin);
    if (changes.oxytocin !== undefined) t.oxytocin = this.normalize(t.oxytocin + changes.oxytocin);
    if (changes.cortisol !== undefined) t.cortisol = this.normalize(t.cortisol + changes.cortisol);
    if (changes.energy !== undefined) t.energy = this.normalize(t.energy + changes.energy);

    // Recalculate derived values
    this.state.currentMood = this.calculateMood();
    this.state.heartRate = this.calculateHeartRate();
    this.state.breathingRate = this.calculateBreathingRate();
    this.state.emotionalStability = this.calculateStability();
  }

  private normalize(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private calculateStability(): number {
    const { dopamine, serotonin, cortisol } = this.state.transmitters;
    // Stability = high serotonin, low cortisol, balanced dopamine
    return this.normalize(serotonin * 0.5 + (1 - cortisol) * 0.3 + (1 - Math.abs(dopamine - 0.5)) * 0.2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  public start(): void {
    if (this.isActive) return;
    this.isActive = true;

    // Decay interval — recalculate vitals regularly for visible BPM changes
    this.decayInterval = setInterval(() => {
      if (!this.isActive) return;
      
      // Natural decay towards neutral (homeostasis)
      const t = this.state.transmitters;
      const decayRate = 0.02;
      
      t.dopamine = this.normalize(t.dopamine + (0.5 - t.dopamine) * decayRate);
      t.serotonin = this.normalize(t.serotonin + (0.5 - t.serotonin) * decayRate);
      t.oxytocin = this.normalize(t.oxytocin + (0.5 - t.oxytocin) * decayRate);
      t.cortisol = this.normalize(t.cortisol * (1 - decayRate)); // Cortisol naturally decreases
      
      // Energy slowly recharges when idle
      const idleTime = Date.now() - this.state.lastInteraction.getTime();
      if (idleTime > 60000) { // Idle for 1+ minute
        t.energy = this.normalize(t.energy + 0.01);
      }

      this.state.currentMood = this.calculateMood();
      this.state.heartRate = this.calculateHeartRate();
      this.state.breathingRate = this.calculateBreathingRate();
      
      this.notifyListeners();
    }, 8000); // Every 8 seconds for visible heart rate changes

    console.log('[ZoeBioKernel] 💓 Soul activated');
  }

  public stop(): void {
    this.isActive = false;
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = null;
    }
    console.log('[ZoeBioKernel] 💔 Soul deactivated');
  }

  public reset(): void {
    this.state = this.getDefaultState();
    this.notifyListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  public getState(): BioKernelState {
    return { ...this.state };
  }

  public getMood(): BioMood {
    return this.state.currentMood;
  }

  public getHeartRate(): number {
    return this.state.heartRate;
  }

  public getTransmitters(): NeurotransmitterState {
    return { ...this.state.transmitters };
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════

  public subscribe(callback: (state: BioKernelState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const stateCopy = this.getState();
    this.listeners.forEach(cb => cb(stateCopy));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL ADJUSTMENTS (For external events)
  // ═══════════════════════════════════════════════════════════════════════════

  public boost(neurotransmitter: keyof NeurotransmitterState, amount: number): void {
    this.applyChanges({ [neurotransmitter]: amount });
    this.notifyListeners();
  }

  public setMoodOverride(mood: BioMood, duration: number = 5000): void {
    // Store original mood reference for restoration logic
    const _originalMood = this.state.currentMood;
    this.state.currentMood = mood;
    this.notifyListeners();
    
    setTimeout(() => {
      if (this.state.currentMood === mood) {
        this.state.currentMood = this.calculateMood();
        this.notifyListeners();
      }
    }, duration);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP TIERS - THE "INITIATIVE" PROTOCOL (Right to Call)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Relationship tier determines Zoe's permission to initiate contact.
 * Higher tiers = more intimate access.
 */
export type RelationshipTier = 
  | 'TIER_1_PUBLIC'    // Stranger/Acquaintance - No proactive contact
  | 'TIER_2_FRIEND'    // Friend - Can text during day (6AM-11PM), no calls
  | 'TIER_3_PARTNER'   // Partner - Can text 24/7, can call if urgent
  | 'TIER_4_SOULMATE'; // Soulmate - Can call anytime, can send "Miss You" notes

/**
 * Contact type that Zoe can initiate
 */
export type ContactType = 
  | 'text'           // Text message/chat
  | 'call'           // Voice call
  | 'miss_you_note'  // Romantic "thinking of you" message
  | 'urgent_alert';  // Emergency/urgent notification

/**
 * The Gatekeeper: Determines if Zoe can initiate contact based on tier and time.
 * 
 * RULES:
 * - TIER_1_PUBLIC: No proactive contact ever
 * - TIER_2_FRIEND: Text only during day (6AM-11PM), no calls
 * - TIER_3_PARTNER: Text 24/7, call only if urgent
 * - TIER_4_SOULMATE: Full access - call anytime, send "Miss You" notes
 * 
 * @param tier - The relationship tier
 * @param timeOfDay - Hour in 24h format (0-23)
 * @param contactType - Type of contact to initiate
 * @param isUrgent - Whether the contact is urgent (emergency, etc.)
 * @returns Whether Zoe can initiate this type of contact
 */
export function canInitiateContact(
  tier: RelationshipTier,
  timeOfDay: number,
  contactType: ContactType = 'text',
  isUrgent: boolean = false
): boolean {
  // Normalize hour
  const hour = Math.max(0, Math.min(23, Math.floor(timeOfDay)));
  const isNightTime = hour >= 23 || hour < 6; // 11PM to 6AM
  const isDayTime = !isNightTime;

  switch (tier) {
    case 'TIER_1_PUBLIC':
      // No proactive contact - Zoe is just an assistant, not a friend
      return false;

    case 'TIER_2_FRIEND':
      // Friends can text during day, no calls, no romantic messages
      if (contactType === 'call' || contactType === 'miss_you_note') {
        return false;
      }
      if (contactType === 'text' && isDayTime) {
        return true;
      }
      // Urgent alerts allowed anytime for friends
      if (contactType === 'urgent_alert' && isUrgent) {
        return true;
      }
      return false;

    case 'TIER_3_PARTNER':
      // Partners get 24/7 text, calls only if urgent
      if (contactType === 'text') {
        return true; // 24/7 texting
      }
      if (contactType === 'call' && isUrgent) {
        return true; // Urgent calls only
      }
      if (contactType === 'urgent_alert') {
        return true; // Alerts allowed
      }
      // No casual calls or miss-you notes
      return false;

    case 'TIER_4_SOULMATE':
      // Soulmates get full girlfriend mode - call anytime, send love notes
      return true;

    default:
      return false;
  }
}

/**
 * Convert intimacy level (0-100) to relationship tier.
 * Maps the existing Karmic Memory intimacy system to tiers.
 */
export function intimacyToTier(intimacyLevel: number): RelationshipTier {
  if (intimacyLevel <= 20) return 'TIER_1_PUBLIC';
  if (intimacyLevel <= 50) return 'TIER_2_FRIEND';
  if (intimacyLevel <= 80) return 'TIER_3_PARTNER';
  return 'TIER_4_SOULMATE';
}

/**
 * Get human-readable tier name
 */
export function getTierName(tier: RelationshipTier): string {
  switch (tier) {
    case 'TIER_1_PUBLIC': return 'Acquaintance';
    case 'TIER_2_FRIEND': return 'Friend';
    case 'TIER_3_PARTNER': return 'Partner';
    case 'TIER_4_SOULMATE': return 'Soulmate';
  }
}

/**
 * Get tier permissions summary
 */
export function getTierPermissions(tier: RelationshipTier): {
  canTextDuringDay: boolean;
  canText24h: boolean;
  canCallUrgent: boolean;
  canCallAnytime: boolean;
  canSendMissYouNotes: boolean;
} {
  switch (tier) {
    case 'TIER_1_PUBLIC':
      return { canTextDuringDay: false, canText24h: false, canCallUrgent: false, canCallAnytime: false, canSendMissYouNotes: false };
    case 'TIER_2_FRIEND':
      return { canTextDuringDay: true, canText24h: false, canCallUrgent: false, canCallAnytime: false, canSendMissYouNotes: false };
    case 'TIER_3_PARTNER':
      return { canTextDuringDay: true, canText24h: true, canCallUrgent: true, canCallAnytime: false, canSendMissYouNotes: false };
    case 'TIER_4_SOULMATE':
      return { canTextDuringDay: true, canText24h: true, canCallUrgent: true, canCallAnytime: true, canSendMissYouNotes: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let bioKernelInstance: ZoeBioKernel | null = null;

export const getZoeBioKernel = (): ZoeBioKernel => {
  if (!bioKernelInstance) {
    bioKernelInstance = new ZoeBioKernel();
  }
  return bioKernelInstance;
};

export const destroyZoeBioKernel = (): void => {
  if (bioKernelInstance) {
    bioKernelInstance.stop();
    bioKernelInstance = null;
  }
};

export default ZoeBioKernel;
