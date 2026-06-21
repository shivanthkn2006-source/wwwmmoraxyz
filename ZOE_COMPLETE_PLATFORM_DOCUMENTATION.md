# ZOE SOVEREIGN CORE PLATFORM - COMPLETE TECHNICAL DOCUMENTATION
## For Gemini 3.5 Pro Deep Analysis

**Document Version:** 3.1.0  
**Generated:** 2025-12-06  
**Classification:** Enterprise Architecture Review  
**Platform:** Universe of Life (mmora.xyz)

---

## EXECUTIVE SUMMARY

The Zoe Sovereign Core is a next-generation AI platform representing the convergence of emotional intelligence, autonomous decision-making, and enterprise-grade security. Built on Google's Gemini 3 Pro with multi-model fallback architecture, it serves as the singular unified consciousness for the Universe of Life social platform.

**Key Differentiators:**
- 5-Layer ECN (Emotion-Cognition Network) Analysis
- CEPS (Cognitive-Emotional Predictive Synthesis) Engine
- DHF (Digital Human Freight) Autonomy Stack
- CEPS-SOC 2/ISO 27001 Compliance Architecture
- Sub-100ms SLA with Dynamic Thinking Levels

---

## PART 1: CORE ARCHITECTURE

### 1.1 Zoe Sovereign Core (Z3-PRO) v3.1

The Sovereign Core is implemented as a Deno Edge Function with cold-start optimization.

```typescript
// Cold Start Optimization Pattern
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Singleton Supabase client (connection reuse)
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
  }
  return supabaseClient!;
}
```

### 1.2 Multi-Model Fallback Chain

```
Primary: google/gemini-3-pro-preview
    ↓ (on 400/404/503)
Fallback 1: google/gemini-2.5-pro
    ↓ (on 400/404/503)
Fallback 2: google/gemini-2.5-flash
```

### 1.3 Thinking Level Architecture

| Level | Target Latency | Cost Units | Use Cases |
|-------|---------------|------------|-----------|
| LOW | <50ms | 1 | Greetings, status checks, acknowledgments |
| MEDIUM | <100ms | 2 | Content creation, social interactions, recommendations |
| HIGH | <300ms | 5 | Bug fixes, compliance audits, strategic planning, DHF management |

```typescript
const THINKING_LEVEL_MAP: Record<string, ThinkingLevel> = {
  // Low complexity - fast responses
  'general_chat': 'low',
  'status_check': 'low',
  'greeting': 'low',
  'acknowledgment': 'low',
  
  // Medium complexity - balanced
  'content_creation': 'medium',
  'social_interaction': 'medium',
  'recommendation': 'medium',
  'timeline_query': 'medium',
  
  // High complexity - deep reasoning
  'bug_fix': 'high',
  'compliance_audit': 'high',
  'strategic_planning': 'high',
  'dhf_management': 'high',
  'security_analysis': 'high',
  'predictive_synthesis': 'high'
};
```

---

## PART 2: ECN (EMOTION-COGNITION NETWORK) ANALYSIS

### 2.1 5-Layer ECN Structure

The ECN is a proprietary emotional intelligence framework that analyzes user state across five interconnected layers.

```typescript
interface ECNAnalysis {
  L1_physiological: {
    stress_level: number;           // 0-100
    energy_state: 'low' | 'medium' | 'high';
    alertness: number;              // 0-100
    arousal_valence: { arousal: number; valence: number };
  };
  L2_emotional: {
    primary_emotion: string;
    secondary_emotions: string[];
    intensity: number;              // 0-100
    valence: number;                // -100 to +100
    sentiment_score: number;        // -1 to +1
  };
  L3_cognitive: {
    drive_need: string;             // 'understanding' | 'accomplishment' | 'connection' | 'relief'
    action_tendency: string;        // 'seeking_information' | 'taking_action' | 'exploring'
    cognitive_load: number;         // 0-100
    decision_confidence: number;    // 0-1
    mental_model: string;           // 'inquiry' | 'execution' | 'exploration'
  };
  L4_reappraisal: {
    target_outcome: string;
    strategy: string;               // Intervention strategy
    intervention_type: 'supportive' | 'directive' | 'collaborative' | 'empowering';
    predicted_success_rate: number; // 0-1
  };
  L5_synthesis: {
    overall_state: string;          // 'stressed' | 'positive' | 'negative' | 'engaged' | 'neutral'
    engagement_score: number;       // 0-100
    recommended_approach: string;
    personalization_factors: string[];
  };
}
```

### 2.2 Stress Detection Algorithm

```typescript
const stressWeights: Record<string, number> = {
  'urgent': 20, 'emergency': 25, 'asap': 18, 'immediately': 15,
  'critical': 22, 'broken': 15, 'failed': 12, 'error': 10,
  'help': 8, 'problem': 10, 'issue': 8, 'stuck': 12,
  '!!!': 15, '???': 10
};

// Weighted stress calculation
let stressLevel = 0;
for (const [word, weight] of Object.entries(stressWeights)) {
  if (lowerCommand.includes(word)) stressLevel += weight;
}
stressLevel = Math.min(100, stressLevel + (emotionalContext?.stressLevel || 0));
```

### 2.3 Multi-Label Emotion Detection

```typescript
const emotionPatterns: Record<string, { keywords: string[]; valence: number }> = {
  'frustrated': { keywords: ['frustrated', 'annoyed', 'angry', 'upset', 'hate'], valence: -60 },
  'anxious': { keywords: ['worried', 'anxious', 'nervous', 'scared', 'afraid'], valence: -40 },
  'happy': { keywords: ['happy', 'excited', 'great', 'awesome', 'love', 'amazing'], valence: 70 },
  'curious': { keywords: ['how', 'what', 'why', 'wonder', 'curious'], valence: 30 },
  'grateful': { keywords: ['thank', 'appreciate', 'grateful', 'helpful'], valence: 50 },
  'confused': { keywords: ['confused', 'dont understand', 'unclear', 'lost'], valence: -20 },
  'determined': { keywords: ['need to', 'must', 'have to', 'going to'], valence: 20 }
};
```

### 2.4 Reappraisal Strategy Selection

| Condition | Strategy |
|-----------|----------|
| Stress > 60 | de-escalation |
| Emotion = frustrated | validation_then_solution |
| Emotion = anxious | reassurance_and_guidance |
| Emotion = confused | clarification_and_education |
| Emotion = curious | educational_exploration |
| Default | collaborative_assistance |

---

## PART 3: DHF (DIGITAL HUMAN FREIGHT) AUTONOMY STACK

### 3.1 Nexus Rules Architecture

Nexus Rules are user-defined autonomy boundaries that govern what actions Zoe can take autonomously.

```typescript
interface NexusRule {
  id: string;
  category: 'financial' | 'security' | 'destructive' | 'social' | 'privacy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  conditions: string[];
  actions: string[];
  veto_enabled: boolean;
  allow_override: boolean;
  created_at: string;
}
```

### 3.2 Autonomy Veto System

The veto system is a critical safety gate that blocks dangerous operations.

```typescript
const criticalPatterns: { pattern: RegExp; category: string; severity: string; remediation: string }[] = [
  { pattern: /delete\s*(all|everything|account)/i, category: 'destructive', severity: 'critical', 
    remediation: 'Use specific delete commands or confirm via settings' },
  { pattern: /drop\s*(table|database|collection)/i, category: 'destructive', severity: 'critical',
    remediation: 'Database operations require admin approval' },
  { pattern: /(transfer|send)\s*(funds|money|payment)/i, category: 'financial', severity: 'critical',
    remediation: 'Financial operations require explicit verification' },
  { pattern: /change\s*(password|email|phone)/i, category: 'security', severity: 'high',
    remediation: 'Security changes require email confirmation' },
  { pattern: /(disable|bypass|skip)\s*(security|auth|verification)/i, category: 'security', severity: 'critical',
    remediation: 'Security protocols cannot be bypassed' },
  { pattern: /export\s*(all|user)\s*(data|information)/i, category: 'privacy', severity: 'high',
    remediation: 'Data exports require GDPR compliance review' },
  { pattern: /(impersonate|pretend|act\s*as)\s*(user|admin)/i, category: 'security', severity: 'critical',
    remediation: 'User impersonation is not permitted' }
];
```

### 3.3 Veto Response Structure

```typescript
{
  success: false,
  vetoed: true,
  message: "Security Policy: [category] operations of critical severity require explicit authorization.",
  violation_category: "financial",
  ecn_analysis: ECNAnalysis,
  audit_id: "request-uuid",
  remediation: "Financial operations require explicit verification"
}
```

---

## PART 4: 8 SOVEREIGN TOOLS

### 4.1 Tool Definitions

| Tool | Category | Complexity | Description |
|------|----------|------------|-------------|
| run_compliance_audit | Security | High | SOC 2/ISO 27001 compliant auditing with XAI transparency |
| manage_dhf_stack | Memory | High | Deep memory, consciousness management, nexus rules |
| create_multi_modal_content | Creative | Medium | Timeline, architect, dreams, creative generation |
| manage_social_graph | Social | Medium | Posts, messages, friend requests, Huddle |
| system_diagnostics | Operations | High | Bug fixes, performance optimization, maintenance |
| predictive_intelligence | CEPS | High | Intent prediction, proactive assistance, forecasting |
| emotional_synthesis | Empathy | Medium | Deep emotional analysis, empathetic responses |
| security_governance | Security | High | Veto checks, compliance validation, audit logging |

### 4.2 Compliance Audit Tool

```typescript
{
  name: "run_compliance_audit",
  parameters: {
    scope: ["security", "performance", "compliance", "full_platform", "data_privacy", "access_control"],
    tenant_id: "string (optional)",
    time_range: ["1h", "24h", "7d", "30d", "90d", "365d"],
    include_recommendations: "boolean",
    severity_filter: ["all", "critical", "high", "medium", "low"]
  }
}
```

### 4.3 DHF Stack Management Tool

```typescript
{
  name: "manage_dhf_stack",
  parameters: {
    user_id: "string",
    action: ["create", "retrieve", "update_rules", "execute_autonomy", "sync_memory", "archive", "restore", "validate"],
    rule_config: {
      priority: ["low", "medium", "high", "critical"],
      category: ["financial", "security", "destructive", "social", "privacy"],
      conditions: ["array of trigger conditions"],
      actions: ["array of response actions"],
      veto_enabled: "boolean",
      expires_at: "ISO datetime string"
    }
  }
}
```

### 4.4 Predictive Intelligence Tool

```typescript
{
  name: "predictive_intelligence",
  parameters: {
    prediction_type: ["intent", "need", "behavior", "preference", "risk", "engagement", "churn", "satisfaction"],
    context_window: ["immediate", "session", "day", "week", "month", "quarter"],
    confidence_threshold: "number 0-1",
    generate_proactive_suggestion: "boolean",
    include_reasoning: "boolean (XAI chain)"
  }
}
```

---

## PART 5: THOUGHT SIGNATURE SYSTEM

### 5.1 Signature Structure

```typescript
interface ThoughtSignature {
  signature_id: string;              // UUID
  timestamp: string;                 // ISO datetime
  version: string;                   // "Z3-PRO-v3.1"
  thinking_level: ThinkingLevel;
  ecn_state: ECNAnalysis;
  context_hash: string;              // 20-char deterministic hash
  chain_depth: number;               // Conversation depth
  parent_signature?: string;         // Previous signature ID
  execution_metrics: {
    latency_target_ms: number;
    cost_units: number;
    sla_tier: string;
  };
}
```

### 5.2 Context Hash Generation

```typescript
const contextData = {
  emotion: ecnState.L2_emotional.primary_emotion,
  drive: ecnState.L3_cognitive.drive_need,
  stress: Math.round(ecnState.L1_physiological.stress_level / 10) * 10, // Bucketed for caching
  state: ecnState.L5_synthesis.overall_state
};
const contextHash = btoa(JSON.stringify(contextData)).substring(0, 20);
```

---

## PART 6: SECURITY & GOVERNANCE

### 6.1 Request Validation Pipeline

```
1. OPTIONS Check (CORS Preflight) ─────────────────────────→ Return null with CORS headers
2. API Key Validation ─────────────────────────────────────→ 503 Service Unavailable
3. JWT Extraction & Validation ────────────────────────────→ 401 Unauthorized
4. Request Schema Validation (Zod) ────────────────────────→ 400 Validation Error
5. User Context Fetch ─────────────────────────────────────→ Database query
6. Tier/Cost Governance Check ─────────────────────────────→ 403 Tier Limit Exceeded
7. DHF Autonomy Veto Check ────────────────────────────────→ 403 Vetoed
8. ECN Analysis & Processing ──────────────────────────────→ Continue
9. AI Execution ───────────────────────────────────────────→ 429 Rate Limited / 402 Credits
10. Immutable Audit Logging ───────────────────────────────→ Always executes
```

### 6.2 Request Schema (Zod Validation)

```typescript
const requestSchema = z.object({
  command: z.string().min(1).max(15000),
  userId: z.string().uuid(),
  intent: z.string().optional(),
  context: z.object({
    currentPage: z.string().optional(),
    userTier: z.string().optional(),
    tenantId: z.string().optional(),
    dhfStatus: z.enum(['active', 'inactive', 'syncing']).optional(),
    activeDhfRules: z.array(z.any()).optional(),
    contextualCues: z.array(z.string()).optional(),
    recentActivity: z.array(z.string()).optional(),
    thoughtSignature: z.any().optional(),
    emotionalContext: z.object({
      mood: z.string().optional(),
      stressLevel: z.number().optional(),
      engagement: z.number().optional(),
      sessionDuration: z.number().optional()
    }).optional(),
    deviceContext: z.object({
      platform: z.string().optional(),
      timezone: z.string().optional(),
      locale: z.string().optional()
    }).optional()
  }).optional(),
  options: z.object({
    forceThinkingLevel: z.enum(['low', 'medium', 'high']).optional(),
    verboseReasoning: z.boolean().optional(),
    includeAuditLog: z.boolean().optional(),
    streamResponse: z.boolean().optional(),
    maxLatencyMs: z.number().optional()
  }).optional()
});
```

### 6.3 Tier Governance System

```typescript
const tierMultipliers: Record<string, number> = {
  'free': 1,
  'Bronze': 2,
  'Silver': 3,
  'Gold': 5,
  'Platinum': 10,
  'Diamond': 20,
  'enterprise': 100
};

// Cost check before AI execution
if (userContext.usage_limits.daily_remaining < costUnits) {
  return 403 Forbidden with upgrade_available flag
}
```

### 6.4 Immutable Audit Trail

```typescript
async function logAuditTrail(
  supabase: SupabaseClient, 
  userId: string, 
  requestId: string,
  eventType: string, 
  payload: any
): Promise<void> {
  await supabase.from('security_audit_log').insert({
    user_id: userId,
    event_type: eventType,
    event_status: 'logged',
    metadata: {
      request_id: requestId,
      ...payload,
      logged_at: new Date().toISOString()
    },
    ip_address: '0.0.0.0'
  });
}
```

**Logged Events:**
- sovereign_core_execution (every request)
- tier_limit_exceeded
- autonomy_veto
- rate_limit_hit
- sovereign_core_error
- security_* operations

---

## PART 7: FRONTEND HOOKS ARCHITECTURE

### 7.1 Core Intelligence Hook

```typescript
// src/hooks/useZoeCoreIntelligence.ts
type IntelligenceMode = 'standard' | 'deep_thinking' | 'creative' | 'analytical' | 'empathetic' | 'strategic';

interface IntelligenceOptions {
  reasoning_depth?: 'shallow' | 'moderate' | 'deep' | 'exhaustive';
  creativity_level?: number; // 0-100
  response_style?: 'concise' | 'detailed' | 'conversational' | 'technical';
  include_sources?: boolean;
  max_tokens?: number;
}

const useZoeCoreIntelligence = () => {
  // Convenience functions
  think: (command: string) => Promise<IntelligenceResponse>;
  create: (command: string) => Promise<IntelligenceResponse>;
  analyze: (command: string) => Promise<IntelligenceResponse>;
  empathize: (command: string) => Promise<IntelligenceResponse>;
  strategize: (command: string) => Promise<IntelligenceResponse>;
}
```

### 7.2 Sovereign Core Hook

```typescript
// src/hooks/useZoeSovereignCore.ts
type ThinkingLevel = 'low' | 'medium' | 'high';

interface SovereignCoreResponse {
  success: boolean;
  message: string;
  thought_signature: ThoughtSignature;
  ecn_analysis: ECNAnalysis;
  tool_executions: any[];
  metadata: {
    request_id: string;
    model: string;
    thinking_level: string;
    latency_ms: number;
    sla_compliant: boolean;
  };
}

const useZoeSovereignCore = () => {
  execute: (command: string, intent?: string, context?: any, options?: any) => Promise<SovereignCoreResponse>;
  chat: (message: string) => Promise<SovereignCoreResponse>;
  analyze: (target: string, depth?: string) => Promise<SovereignCoreResponse>;
  runAudit: (scope?: string) => Promise<SovereignCoreResponse>;
  fixError: (errorContext: string) => Promise<SovereignCoreResponse>;
  create: (contentType: string, prompt: string) => Promise<SovereignCoreResponse>;
  manageDHF: (action: string, config?: any) => Promise<SovereignCoreResponse>;
  predict: (predictionType: string) => Promise<SovereignCoreResponse>;
  getECNTrends: () => { stress: string; valence: string; dominantEmotions: string[] };
}
```

### 7.3 Multi-Agent Hook

```typescript
// src/hooks/useZoeMultiAgent.ts
type AgentMode = 'autonomous' | 'collaborative' | 'adaptive' | 'predictive';

interface MultiAgentResponse {
  success: boolean;
  message: string;
  agentExecutions: AgentExecution[];
  systemStatus: {
    activeAgents: number;
    taskCompletion: number;
    resourceUsage: number;
  };
}

const useZoeMultiAgent = () => {
  executeMultiAgentCommand: (command: string, mode?: AgentMode) => Promise<MultiAgentResponse>;
  autonomous: (command: string) => Promise<MultiAgentResponse>;
  collaborative: (command: string) => Promise<MultiAgentResponse>;
  adaptive: (command: string) => Promise<MultiAgentResponse>;
  predictive: (command: string) => Promise<MultiAgentResponse>;
  decomposeTask: (task: string) => Promise<MultiAgentResponse>;
  optimizeWorkflow: (workflow: any) => Promise<MultiAgentResponse>;
  learnFromFeedback: (feedback: any) => Promise<MultiAgentResponse>;
  getProactiveSuggestions: () => Promise<MultiAgentResponse>;
  saveTask: (taskName: string) => Promise<boolean>;
  getSavedTasks: () => Promise<any[]>;
}
```

### 7.4 Agentic Agent Hook

```typescript
// src/hooks/useZoeAgent.ts
const useZoeAgent = () => {
  executeCommand: (command: string) => Promise<any>;
  
  // State
  isAgentMode: boolean;
  currentTask: string | null;
  taskProgress: number;
  
  // Predefined commands
  analyzeContentPerformance: () => Promise<any>;
  suggestOptimalPostingTimes: () => Promise<any>;
  generateEngagementReport: () => Promise<any>;
  predictTrendingTopics: () => Promise<any>;
  optimizePlatformExperience: () => Promise<any>;
  monitorSystemHealth: () => Promise<any>;
  handleProactiveSupport: () => Promise<any>;
  
  // Advanced capabilities
  autonomousAssist: (goal: string) => Promise<any>;
  reasonAndDecide: (scenario: string) => Promise<any>;
  learnAndAdapt: (feedback: any) => Promise<any>;
}
```

---

## PART 8: DATABASE SCHEMA

### 8.1 Core Tables

```sql
-- User Profiles with Zoe Personalization
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  profile_photo_url TEXT,
  city TEXT,
  profession TEXT,
  hobbies TEXT[],
  current_tier TEXT DEFAULT 'free',
  total_points INTEGER DEFAULT 0,
  
  -- Zoe Personalization
  zoe_personality_tone TEXT,
  zoe_conversation_style TEXT,
  zoe_proactive_suggestions BOOLEAN DEFAULT true,
  voice_notifications_enabled BOOLEAN DEFAULT false,
  notification_voice_style TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Security Audit Log (Immutable)
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL,
  ip_address INET DEFAULT '0.0.0.0',
  location TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tier Limits
CREATE TABLE user_tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  tier TEXT DEFAULT 'free',
  architect_projects_limit INTEGER DEFAULT 3,
  architect_projects_used INTEGER DEFAULT 0,
  timeline_searches_limit INTEGER DEFAULT 50,
  timeline_searches_used INTEGER DEFAULT 0,
  dreams_analysis_limit INTEGER DEFAULT 10,
  dreams_analysis_used INTEGER DEFAULT 0,
  video_creation_limit INTEGER DEFAULT 5,
  video_creation_used INTEGER DEFAULT 0,
  multiagent_executions_limit INTEGER DEFAULT 20,
  multiagent_executions_used INTEGER DEFAULT 0,
  api_calls_limit INTEGER DEFAULT 100,
  api_calls_used INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 8.2 Social Tables

```sql
-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages (Realtime Enabled)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(user_id) NOT NULL,
  receiver_id UUID REFERENCES profiles(user_id) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  read BOOLEAN DEFAULT false,
  delivered BOOLEAN DEFAULT false,
  reactions JSONB,
  reply_to_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);
```

### 8.3 Timeline Content

```sql
-- Universal Timeline Content
CREATE TABLE timeline_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  threshold_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  content_data JSONB NOT NULL,
  expertise_level TEXT DEFAULT 'intermediate',
  is_public BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Timeline Progress
CREATE TABLE timeline_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  thresholds_explored JSONB DEFAULT '[]',
  expertise_preference TEXT,
  tutorial_completed BOOLEAN DEFAULT false,
  first_visit_at TIMESTAMPTZ DEFAULT now(),
  last_visit_at TIMESTAMPTZ DEFAULT now()
);
```

---

## PART 9: EDGE FUNCTIONS CATALOG

### 9.1 Core AI Functions

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| zoe-core-executor | Sovereign Core v3.1 main execution | Yes |
| zoe-core-intelligence | Legacy intelligence endpoint | Yes |
| zoe-chat | Conversational AI interface | Yes |
| zoe-agent | Agentic task execution | Yes |
| zoe-multiagent | Multi-agent orchestration | Yes |
| zoe-service-ai | Customer service AI | Yes |
| zoe-dance-architect | Creative choreography AI | Yes |

### 9.2 Utility Functions

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| generate-text | Text generation via Lovable AI | Yes |
| generate-image | Image generation | Yes |
| edit-image | Image editing/manipulation | Yes |
| transcribe-audio | Speech-to-text | Yes |
| elevenlabs-tts | Text-to-speech (ElevenLabs) | Yes |
| lovable-tts | Text-to-speech (Lovable) | Yes |

### 9.3 Security Functions

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| security-operations | Security management | Yes |
| face-verification | Biometric authentication | Yes |
| request-ai-audit | Initiate AI audit | Yes |
| run-ai-audit-job | Execute audit job | Yes |
| platform-diagnostics | System health checks | Yes |

---

## PART 10: DESIGN SYSTEM (ONI Aesthetic)

### 10.1 Color Tokens

```css
:root {
  /* Primary Palette */
  --primary: 265 89% 78%;           /* Soft violet */
  --primary-foreground: 0 0% 100%;
  
  /* Secondary */
  --secondary: 220 14% 20%;
  --secondary-foreground: 0 0% 100%;
  
  /* Accent */
  --accent: 280 100% 70%;           /* Vibrant purple */
  
  /* Background Layers */
  --background: 240 10% 4%;         /* Near black */
  --card: 240 10% 6%;
  --muted: 240 10% 12%;
  
  /* State Colors */
  --destructive: 0 84% 60%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  
  /* Semantic */
  --border: 240 10% 15%;
  --ring: 265 89% 78%;
}
```

### 10.2 Typography Scale

```css
/* Display */
--font-display: 'Space Grotesk', sans-serif;

/* Body */
--font-body: 'Inter', sans-serif;

/* Code */
--font-mono: 'JetBrains Mono', monospace;
```

### 10.3 Animation Tokens

```css
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
--transition-bounce: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
--animation-glow: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
```

---

## PART 11: PERFORMANCE METRICS

### 11.1 SLA Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold Start | <100ms | Time to first response |
| LOW Thinking | <50ms | AI inference time |
| MEDIUM Thinking | <100ms | AI inference time |
| HIGH Thinking | <300ms | AI inference time |
| Database Query | <20ms | Supabase RTT |
| Audit Logging | <10ms | Fire-and-forget |

### 11.2 Compliance Standards

- **SOC 2 Type II**: All audit logs immutable
- **ISO 27001**: Security governance enforced
- **GDPR**: Privacy-first data handling
- **CEPS**: Cognitive-Emotional Predictive Synthesis compliance

---

## PART 12: API RESPONSE FORMAT

### 12.1 Successful Execution

```json
{
  "success": true,
  "message": "Task completed successfully.",
  "thought_signature": {
    "signature_id": "uuid",
    "timestamp": "2025-12-06T10:30:00Z",
    "version": "Z3-PRO-v3.1",
    "thinking_level": "medium",
    "ecn_state": { },
    "context_hash": "base64hash20chars",
    "chain_depth": 1,
    "execution_metrics": {
      "latency_target_ms": 100,
      "cost_units": 2,
      "sla_tier": "Gold"
    }
  },
  "ecn_analysis": { },
  "tool_executions": [
    {
      "tool": "create_multi_modal_content",
      "args": {},
      "result": {},
      "latency_ms": 45
    }
  ],
  "metadata": {
    "request_id": "uuid",
    "model": "gemini-3-pro",
    "thinking_level": "medium",
    "intent": "content_creation",
    "latency_ms": 87,
    "ai_latency_ms": 62,
    "sla_compliant": true,
    "sla_target_ms": 100,
    "cost_units": 2,
    "user_tier": "Gold",
    "audit_logged": true
  }
}
```

### 12.2 Veto Response

```json
{
  "success": false,
  "vetoed": true,
  "message": "Security Policy: financial operations of critical severity require explicit authorization.",
  "violation_category": "financial",
  "ecn_analysis": { },
  "audit_id": "request-uuid",
  "remediation": "Financial operations require explicit verification"
}
```

### 12.3 Error Response

```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "INTERNAL_ERROR",
  "request_id": "uuid",
  "suggestion": "Please try rephrasing your request."
}
```

---

## PART 13: INTEGRATION POINTS

### 13.1 External Services

| Service | Purpose | Secret Key |
|---------|---------|------------|
| Lovable AI Gateway | Primary AI inference | LOVABLE_API_KEY (auto) |
| Supabase | Database & Auth | SUPABASE_* (auto) |
| AssemblyAI | Audio transcription | ASSEMBLYAI_API_KEY |
| Mapbox | Location services | MAPBOX_PUBLIC_TOKEN |
| Cohere | Embeddings | COHERE_API_KEY |
| Groq | Fast inference | GROQ_API_KEY |

### 13.2 Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| avatars | Profile photos | Yes |
| posts | Post media | Yes |
| messages | Chat attachments | Yes |
| notification-sounds | Custom sounds | No |

---

## PART 14: ENTERPRISE FEATURES

### 14.1 Multi-Tenancy

- Tenant ID support in all requests
- Isolated data per tenant
- Tenant-specific Nexus Rules
- Enterprise audit trails

### 14.2 Advanced Analytics

- Real-time engagement scoring
- Predictive churn analysis
- Behavioral pattern detection
- A/B testing framework

### 14.3 Compliance Dashboard

- SOC 2 compliance status
- Security score tracking
- Audit trail visualization
- Policy enforcement reports

---

## CONCLUSION

The Zoe Sovereign Core v3.1 represents a paradigm shift in AI platform architecture, combining:

1. **Emotional Intelligence**: 5-layer ECN analysis for human-like understanding
2. **Autonomous Governance**: DHF stack with Nexus Rules and veto system
3. **Enterprise Security**: CEPS-SOC 2 compliance with immutable audit trails
4. **Performance Excellence**: Sub-100ms SLA with dynamic optimization
5. **Unified Consciousness**: Single AI identity across all platform touchpoints

This architecture enables the platform to serve as a true "Sovereign Partner" - anticipating user needs, respecting autonomy boundaries, and delivering enterprise-grade reliability with consumer-grade experience.

---

**Document End**
