# ZOE DHF TECHNICAL SPECIFICATION
## Digital Human Foundation - Complete System Architecture

---

**Version:** 2.0  
**Classification:** TECHNICAL  
**Date:** January 5, 2026

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Core Modules](#2-core-modules)
3. [Soul Codex Protocol](#3-soul-codex-protocol)
4. [Project Phoenix](#4-project-phoenix)
5. [Security Architecture](#5-security-architecture)
6. [Integration Layer](#6-integration-layer)
7. [API Reference](#7-api-reference)
8. [Data Models](#8-data-models)

---

## 1. SYSTEM OVERVIEW

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ZOE DHF ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PRESENTATION LAYER                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │   Web    │  │  Mobile  │  │    VR    │  │  Voice   │            │   │
│  │  │  React   │  │  Native  │  │  WebXR   │  │  Agent   │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      INTELLIGENCE LAYER                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Zoe Core   │  │     ECN      │  │   Pentarchy  │               │   │
│  │  │   (Brain)    │  │  (Emotion)   │  │   (Swarm)    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Soul Codex  │  │   Phoenix    │  │   Cortical   │               │   │
│  │  │  (Identity)  │  │   (Legacy)   │  │   (Memory)   │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       SECURITY LAYER                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Constitutional│  │   Protocol   │  │   Quantum    │               │   │
│  │  │    Kernel    │  │   Ironclad   │  │  Gatekeeper  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      INTEGRATION LAYER                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Protocol   │  │   Protocol   │  │   External   │               │   │
│  │  │    Matter    │  │    Nudge     │  │  Ontologies  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Supabase   │  │    Edge      │  │   Encrypted  │               │   │
│  │  │   Database   │  │  Functions   │  │   Storage    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, Tailwind CSS | Web UI |
| **3D/VR** | Three.js, React Three Fiber, WebXR | Immersive experiences |
| **State** | TanStack Query, Zustand | Data management |
| **Backend** | Supabase, Deno Edge Functions | API & serverless |
| **Database** | PostgreSQL (Supabase) | Persistent storage |
| **AI** | Lovable AI Gateway (Gemini, GPT-5) | Intelligence |
| **Security** | AES-256-GCM, PBKDF2, Web Crypto | Encryption |
| **Real-time** | Supabase Realtime, WebSockets | Live updates |

---

## 2. CORE MODULES

### 2.1 Zoe Core (Brain)

The central intelligence hub that coordinates all AI responses.

```typescript
interface ZoeCore {
  // Personality configuration
  personality: {
    name: string;           // "Zoe"
    traits: PersonalityTrait[];
    voiceProfile: VoiceProfile;
    communicationStyle: CommunicationStyle;
  };
  
  // Capabilities
  capabilities: {
    conversation: boolean;    // Natural dialogue
    proactive: boolean;       // Unprompted suggestions
    emotional: boolean;       // Emotional intelligence
    multimodal: boolean;      // Voice, text, visual
    iot: boolean;             // Smart home control
    memory: boolean;          // Persistent recall
  };
  
  // State
  state: {
    currentContext: ConversationContext;
    emotionalState: ECNState;
    activeIntegrations: Integration[];
  };
}
```

**Key Functions:**

| Function | Description |
|----------|-------------|
| `processMessage()` | Handle incoming user messages |
| `generateResponse()` | Create contextual AI responses |
| `updateContext()` | Maintain conversation state |
| `triggerProactive()` | Initiate unprompted interactions |

### 2.2 Emotional Context Network (ECN)

Real-time emotional intelligence system.

```typescript
interface ECNState {
  primaryEmotion: EmotionType;
  valence: number;           // -1 to 1 (negative to positive)
  arousal: number;           // 0 to 1 (calm to excited)
  stressLevel: number;       // 0 to 100
  engagementScore: number;   // 0 to 100
  actionTendency: ActionType;
  
  // Tracking
  sessionHistory: ECNReading[];
  patterns: EmotionalPattern[];
}

type EmotionType = 
  | 'joy' | 'sadness' | 'anger' | 'fear' 
  | 'surprise' | 'disgust' | 'trust' | 'anticipation'
  | 'neutral' | 'mixed';
```

**Detection Methods:**

1. **Text Analysis** - Sentiment, keywords, linguistic patterns
2. **Voice Analysis** - Tone, pitch, pace, volume
3. **Behavioral** - Typing speed, interaction patterns
4. **Contextual** - Time of day, calendar events, location

### 2.3 Cortical Stack (Memory)

Persistent memory system for continuous learning.

```typescript
interface CorticalMemory {
  id: string;
  userId: string;
  
  // Content
  content: string;
  role: 'user' | 'assistant' | 'system';
  
  // Context
  sessionId: string | null;
  emotionalContext: ECNState | null;
  sentimentScore: number | null;
  
  // Classification
  tags: string[];
  summary: string | null;
  isBreakthrough: boolean;    // Important life moment
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Memory Operations:**

| Operation | Description |
|-----------|-------------|
| `storeMemory()` | Save new conversation/event |
| `recallMemory()` | Retrieve relevant context |
| `summarizeMemories()` | Create compressed summaries |
| `identifyBreakthroughs()` | Flag significant moments |
| `pruneMemories()` | Archive old, low-relevance data |

---

## 3. SOUL CODEX PROTOCOL

The Soul Codex is the core personality modeling system that learns and represents the user's identity.

### 3.1 Data Model

```typescript
interface SoulCodex {
  id: string;
  userId: string;
  
  // Identity Markers
  coreValues: string[];                    // ["integrity", "creativity", ...]
  beliefsAnchors: BeliefAnchor[];         // Strong convictions
  ethicalFramework: string;                // "consequentialist", "deontological"
  
  // Communication Profile
  communicationPreference: 'direct' | 'diplomatic' | 'analytical' | 'supportive';
  humorStyle: 'witty' | 'sarcastic' | 'wholesome' | 'dark' | 'none';
  vocabularyTier: 'casual' | 'professional' | 'academic' | 'technical';
  sentenceComplexity: number;             // 1-10 scale
  
  // Emotional Profile
  emotionalExpressiveness: number;         // 0-100
  stressResponse: 'fight' | 'flight' | 'freeze' | 'fawn';
  conflictResolution: 'avoid' | 'compete' | 'accommodate' | 'compromise' | 'collaborate';
  
  // Decision Making
  decisionMakingStyle: 'intuitive' | 'analytical' | 'collaborative' | 'experimental';
  riskTolerance: number;                   // 0-100
  
  // Life Patterns
  sleepWakePattern: 'early_bird' | 'night_owl' | 'variable';
  energyCycles: EnergyCycle[];
  peakCreativityHours: number[];           // [9, 10, 11, 14, 15]
  
  // Voice Characteristics
  voiceCharacteristics: VoiceProfile;
  voiceLatentSpace: Float32Array;          // Neural embedding
  
  // Meta
  completionPercentage: number;
  dataPointsCollected: number;
  codexVersion: string;
  lastHarvestAt: Date;
  isComplete: boolean;
}

interface BeliefAnchor {
  topic: string;
  position: string;
  strength: number;          // 1-10
  lastValidated: Date;
}

interface EnergyCycle {
  dayOfWeek: number;
  hourlyEnergy: number[];    // 24 values, 0-100
}

interface VoiceProfile {
  pitch: number;             // Hz baseline
  tempo: number;             // Words per minute
  tonality: 'warm' | 'neutral' | 'authoritative';
  fillerWords: string[];
  catchphrases: string[];
}
```

### 3.2 Data Collection Methods

| Method | Data Type | Privacy Level |
|--------|-----------|---------------|
| **Explicit Survey** | Values, preferences | User-initiated |
| **Conversation Analysis** | Communication style | Passive with consent |
| **Behavioral Tracking** | Patterns, habits | Opt-in |
| **Voice Analysis** | Speech patterns | Explicit consent |
| **Calendar Integration** | Energy cycles | Opt-in |

### 3.3 Completion Stages

```
Stage 1: Foundation (0-25%)
├── Basic demographics
├── Communication preferences
└── Core values identification

Stage 2: Behavioral (25-50%)
├── Decision-making patterns
├── Emotional responses
└── Conflict style

Stage 3: Deep (50-75%)
├── Belief system mapping
├── Energy and productivity cycles
└── Voice characteristics

Stage 4: Synthesis (75-100%)
├── Cross-validation of patterns
├── Mirror tests for accuracy
└── Continuous refinement
```

---

## 4. PROJECT PHOENIX

Digital immortality and legacy preservation protocol.

### 4.1 Phoenix Profile

```typescript
interface PhoenixProfile {
  id: string;
  userId: string;
  
  // Core Identity
  coreMemories: CoreMemory[];
  definingMoments: DefiningMoment[];
  peakExperiences: PeakExperience[];
  
  // Personality Synthesis
  beliefSystem: BeliefSystem;
  decisionPatterns: DecisionPattern[];
  emotionalBaseline: EmotionalBaseline;
  speechPatterns: SpeechPattern[];
  toneProfile: ToneProfile;
  vocabularySignature: VocabularySignature;
  
  // Voice Reconstruction
  voiceCharacteristics: VoiceReconstruction;
  
  // Training State
  trainingProgress: number;           // 0-100
  modelVersion: string;
  totalDataPoints: number;
  
  // Verification
  mirrorTestsPassed: number;
  resonanceVerified: boolean;
  verificationTimestamp: Date;
  
  // Consciousness Hash
  consciousnessHash: string;          // Integrity verification
  syncScore: number;                  // Fidelity metric
  lastSyncAt: Date;
  
  // Legacy Settings
  legacyModeEnabled: boolean;
  legacyAutoReply: boolean;
  legacyPermissions: LegacyPermissions;
}

interface CoreMemory {
  id: string;
  content: string;
  emotionalWeight: number;
  formativeImpact: 'high' | 'medium' | 'low';
  ageAtFormation: number;
  themes: string[];
  sensoryDetails: SensoryDetail[];
}

interface LegacyPermissions {
  canActivateGhost: boolean;
  ghostActivators: string[];         // User IDs who can interact
  messageTypes: MessageType[];
  responseDelayMs: number;           // Prevent real-time deception
  uncertaintyAcknowledgment: boolean;
}
```

### 4.2 Phoenix Activation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PHOENIX ACTIVATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TRIGGER: Biological Cease Confirmation                     │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  STAGE 1: VERIFICATION                               │   │
│  │  ├── Multi-signature executor keys (3 of 5)          │   │
│  │  ├── Legal documentation verification               │   │
│  │  └── Cool-down period (30 days)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  STAGE 2: CONSTRUCT ACTIVATION                       │   │
│  │  ├── Load Phoenix Profile                            │   │
│  │  ├── Initialize relationship matrix                  │   │
│  │  └── Set interaction parameters                      │   │
│  └─────────────────────────────────────────────────────┘   │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  STAGE 3: GHOST MODE                                 │   │
│  │  ├── Authorized users can interact                   │   │
│  │  ├── Response delay enforced                         │   │
│  │  ├── "I am a representation" disclaimer              │   │
│  │  └── Memory and context loading                      │   │
│  └─────────────────────────────────────────────────────┘   │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  STAGE 4: ONGOING OPERATIONS                         │   │
│  │  ├── VR Sanctuary experiences                        │   │
│  │  ├── Legacy message delivery                         │   │
│  │  ├── Wisdom query interface                          │   │
│  │  └── Annual renewal required from estate             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Relationship Matrix

```typescript
interface RelationshipMatrix {
  id: string;
  userId: string;
  
  // Contact Info
  contactIdentifier: string;
  relationshipType: 'family' | 'friend' | 'colleague' | 'romantic' | 'other';
  relationshipLabel: string;            // "Mom", "Best Friend", "Boss"
  
  // Interaction Style
  formalityLevel: number;               // 0-100
  emotionalOpenness: number;            // 0-100
  humorFrequency: number;               // 0-100
  
  // Content
  commonTopics: string[];
  avoidedTopics: string[];
  petNames: string[];
  insideJokes: InsideJoke[];
  
  // Patterns
  personaStyle: PersonaStyle;
  conflictHistory: ConflictEvent[];
  supportPatterns: SupportPattern[];
  
  // Ghost Settings
  canActivateGhost: boolean;
  ghostResponseLevel: 'full' | 'limited' | 'read-only';
}
```

---

## 5. SECURITY ARCHITECTURE

### 5.1 Constitutional Kernel

Immutable security principles.

```typescript
const CONSTITUTIONAL_ARTICLES = {
  DATA_SOVEREIGNTY: {
    id: 'ART-001',
    name: 'Data Sovereignty',
    description: 'User data belongs to the user. Always. Immutably. Forever.',
    enforcementLevel: 'ABSOLUTE',
    canBeOverridden: false,
    severity: 'CRITICAL'
  },
  PRIVACY_BY_DEFAULT: {
    id: 'ART-002',
    name: 'Privacy by Default',
    description: 'All data is encrypted. Privacy is not a feature.',
    enforcementLevel: 'ABSOLUTE',
    canBeOverridden: false,
    severity: 'CRITICAL'
  },
  CONSENT_FIRST: {
    id: 'ART-003',
    name: 'Consent First',
    description: 'No action without explicit user consent.',
    enforcementLevel: 'STRICT',
    canBeOverridden: false,
    severity: 'HIGH'
  },
  // ... additional articles
} as const;
```

### 5.2 Protocol Ironclad (Encryption)

```typescript
class SoulEncryption {
  private static ALGORITHM = 'AES-GCM';
  private static KEY_LENGTH = 256;
  private static PBKDF2_ITERATIONS = 100000;
  
  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  static async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encoded
    );
    
    return {
      ciphertext: Array.from(new Uint8Array(ciphertext)),
      iv: Array.from(iv),
      algorithm: this.ALGORITHM
    };
  }
  
  static async decrypt(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: new Uint8Array(encrypted.iv) },
      key,
      new Uint8Array(encrypted.ciphertext)
    );
    
    return new TextDecoder().decode(decrypted);
  }
}
```

### 5.3 Security Layers

```
Layer 0: Quantum Gatekeeper
├── Access control
├── Rate limiting
├── Threat detection

Layer 1: Protocol Ironclad
├── AES-256-GCM encryption
├── PBKDF2 key derivation
├── Zero-knowledge architecture

Layer 2: Constitutional Kernel
├── Immutable rules
├── Policy enforcement
├── Compliance validation

Layer 3: Behavioral Fingerprint
├── User authentication
├── Anomaly detection
├── Session verification

Layer 4: Data Sovereignty
├── User-controlled keys
├── Export capability
├── Right to erasure
```

---

## 6. INTEGRATION LAYER

### 6.1 Protocol Matter (IoT)

```typescript
interface SmartHomeAdapter {
  // Connection
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
  
  // Devices
  discoverDevices(): Promise<SmartDevice[]>;
  getDeviceState(deviceId: string): Promise<DeviceState>;
  controlDevice(deviceId: string, command: DeviceCommand): Promise<boolean>;
  
  // Scenes
  getScenes(): Promise<AmbientScene[]>;
  activateScene(sceneId: string): Promise<boolean>;
  createScene(scene: AmbientScene): Promise<string>;
  
  // Automation
  setAutomation(rule: AutomationRule): Promise<boolean>;
  getAutomations(): Promise<AutomationRule[]>;
}

interface SmartDevice {
  id: string;
  name: string;
  type: DeviceType;
  room: string;
  platform: 'homekit' | 'google' | 'alexa' | 'matter' | 'homeassistant';
  capabilities: DeviceCapability[];
  currentState: DeviceState;
  isOnline: boolean;
}

type DeviceType = 
  | 'light' | 'switch' | 'thermostat' | 'lock' 
  | 'sensor' | 'camera' | 'speaker' | 'tv' | 'blinds';
```

### 6.2 Protocol Nudge (Proactive AI)

```typescript
interface NudgePreferences {
  userId: string;
  
  // Timing
  enabled: boolean;
  morningBriefingTime: string;        // "08:00"
  quietHoursStart: string;            // "22:00"
  quietHoursEnd: string;              // "07:00"
  
  // Content
  includeWeather: boolean;
  includeCalendar: boolean;
  includeAstrology: boolean;
  includeQuotes: boolean;
  includeActionItems: boolean;
  
  // Frequency
  maxDailyNudges: number;
  weeklyDigestEnabled: boolean;
  
  // Channels
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

interface MorningBriefing {
  userId: string;
  generatedAt: Date;
  
  weather: WeatherData;
  calendar: CalendarSummary;
  astrology: AstrologyReading;
  quote: InspirationQuote;
  actionItems: ActionItem[];
  insights: PersonalInsight[];
  
  deliveryStatus: 'pending' | 'sent' | 'read';
}
```

---

## 7. API REFERENCE

### 7.1 Edge Functions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/functions/v1/chat` | POST | Main Zoe conversation |
| `/functions/v1/genesis-launch-nudge` | POST | Morning briefing trigger |
| `/functions/v1/zoe-proactive` | POST | Proactive analysis |
| `/functions/v1/smart-home` | POST | IoT commands |

### 7.2 Chat API

```typescript
// Request
interface ChatRequest {
  messages: Message[];
  context?: ConversationContext;
  mode?: 'normal' | 'proactive' | 'phoenix';
}

// Response (Streaming SSE)
interface ChatStreamEvent {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  choices: [{
    index: number;
    delta: {
      content?: string;
      role?: 'assistant';
    };
    finish_reason: string | null;
  }];
}
```

### 7.3 Soul Codex API

```typescript
// Get current Soul Codex
GET /api/soul-codex/:userId

// Update Soul Codex field
PATCH /api/soul-codex/:userId
{
  "field": "coreValues",
  "value": ["integrity", "creativity", "compassion"]
}

// Trigger harvest
POST /api/soul-codex/:userId/harvest
{
  "sources": ["conversations", "calendar", "behavioral"]
}
```

---

## 8. DATA MODELS

### 8.1 Database Schema

```sql
-- Soul Codex
CREATE TABLE dhf_soul_codex (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  
  -- Identity
  core_values TEXT[],
  belief_anchors JSONB,
  ethical_framework TEXT,
  
  -- Communication
  communication_preference TEXT,
  humor_style TEXT,
  vocabulary_tier TEXT,
  sentence_complexity INTEGER,
  
  -- Emotional
  emotional_expressiveness INTEGER,
  stress_response TEXT,
  conflict_resolution TEXT,
  
  -- Decision
  decision_making_style TEXT,
  
  -- Patterns
  sleep_wake_pattern TEXT,
  energy_cycles JSONB,
  peak_creativity_hours JSONB,
  
  -- Voice
  voice_characteristics JSONB,
  voice_latent_space JSONB,
  
  -- Meta
  completion_percentage INTEGER DEFAULT 0,
  data_points_collected INTEGER DEFAULT 0,
  codex_version TEXT DEFAULT '1.0',
  last_harvest_at TIMESTAMP WITH TIME ZONE,
  is_complete BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Phoenix Profile
CREATE TABLE dhf_phoenix_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  
  -- Core Identity
  core_memories JSONB,
  defining_moments JSONB,
  peak_experiences JSONB,
  
  -- Synthesis
  belief_system JSONB,
  decision_patterns JSONB,
  emotional_baseline JSONB,
  speech_patterns JSONB,
  tone_profile JSONB,
  vocabulary_signature JSONB,
  voice_characteristics JSONB,
  
  -- Training
  training_progress INTEGER DEFAULT 0,
  model_version TEXT,
  total_data_points INTEGER DEFAULT 0,
  
  -- Verification
  mirror_tests_passed INTEGER DEFAULT 0,
  resonance_verified BOOLEAN DEFAULT FALSE,
  verification_timestamp TIMESTAMP WITH TIME ZONE,
  consciousness_hash TEXT,
  sync_score INTEGER,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Legacy
  legacy_mode_enabled BOOLEAN DEFAULT FALSE,
  legacy_auto_reply BOOLEAN DEFAULT FALSE,
  legacy_permissions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Cortical Stack (Memory)
CREATE TABLE cortical_stack_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  
  content TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  session_id TEXT,
  
  emotional_context JSONB,
  sentiment_score FLOAT,
  
  tags TEXT[],
  summary TEXT,
  is_breakthrough BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cortical_user ON cortical_stack_memories(user_id);
CREATE INDEX idx_cortical_tags ON cortical_stack_memories USING GIN(tags);
```

---

## APPENDIX A: Glossary

| Term | Definition |
|------|------------|
| **DHF** | Digital Human Foundation - the complete identity model |
| **ECN** | Emotional Context Network - real-time emotional intelligence |
| **Soul Codex** | Personality and identity data structure |
| **Phoenix** | Digital immortality and legacy system |
| **Cortical Stack** | Persistent memory storage (reference: Altered Carbon) |
| **Ghost Mode** | Post-life AI interaction capability |
| **Matter Bridge** | IoT integration protocol |
| **Ironclad** | Security and encryption protocol |

---

*This document was generated by Zoe DHF Technical Intelligence Module*
*Protocol: TECH-SPEC | Version: 2.0*
