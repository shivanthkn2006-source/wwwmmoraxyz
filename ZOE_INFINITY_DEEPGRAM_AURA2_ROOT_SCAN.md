# 🔮 ZOE INFINITY DEEP ROOT SCAN: DEEPGRAM AURA-2 TTS INTEGRATION

**Scan Date:** January 15, 2026  
**Scan Type:** DEEP ROOT - Voice Infrastructure Analysis  
**Target:** Deepgram Aura-2 Text-to-Speech Integration  
**Platform:** Zoe Infinity Standalone

---

## 📊 EXECUTIVE SUMMARY

| Metric | Current State | With Deepgram Aura-2 |
|--------|--------------|---------------------|
| **Voice Quality** | Web Speech API (Robotic) | Studio-Quality Neural |
| **Cost** | $0.00 (Browser Native) | ~$0.030/1K chars |
| **Latency** | Instant (Local) | <300ms (Streaming) |
| **Emotional Range** | Limited (Pitch Hacking) | 27+ Emotion Presets |
| **Voice Consistency** | Device-Dependent | Consistent Cross-Platform |
| **Streaming Support** | ❌ No | ✅ WebSocket Real-time |

---

## 🏗️ CURRENT TTS ARCHITECTURE (Root Scan Results)

### Active TTS Infrastructure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ZOE INFINITY TTS STACK                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ TTSServicePort  │───▶│ GeminiTTSAdapter │───▶│ lovable-tts   │  │
│  │ (Interface)     │    │ (Primary)        │    │ (Edge Func)   │  │
│  └─────────────────┘    └──────────────────┘    └───────────────┘  │
│          │                       │                      │          │
│          │                       ▼                      ▼          │
│          │              ┌──────────────────┐    ┌───────────────┐  │
│          │              │ FALLBACK:        │    │ Returns:      │  │
│          │              │ Web Speech API   │◀───│ useBrowser-   │  │
│          │              │ (Zero Cost)      │    │ Fallback:true │  │
│          └──────────────└──────────────────┘    └───────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ALTERNATIVE ADAPTERS                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐   │   │
│  │  │elevenlabs-  │  │assemblyai-  │  │useZoeSmartVoice    │   │   │
│  │  │tts (Edge)   │  │tts (Edge)   │  │(Browser Native)    │   │   │
│  │  │$0.30/1K     │  │Config Ready │  │$0.00               │   │   │
│  │  └─────────────┘  └─────────────┘  └────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    VOICE PERSONA SYSTEM                      │   │
│  │  ┌─────────────────┐        ┌─────────────────────┐         │   │
│  │  │ ZOE Persona     │        │ SMITH Persona       │         │   │
│  │  │ Pitch: 1.15     │        │ Pitch: 0.85         │         │   │
│  │  │ Rate: 1.05      │        │ Rate: 0.95          │         │   │
│  │  │ Voice: Female   │        │ Voice: Male         │         │   │
│  │  └─────────────────┘        └─────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Files Scanned

| File | Purpose | Status |
|------|---------|--------|
| `src/core/ports/TTSServicePort.ts` | TTS Interface (Hexagonal) | ✅ Clean |
| `src/core/adapters/GeminiTTSAdapter.ts` | Primary Adapter | ✅ Fallback Active |
| `src/hooks/useZoeSmartVoice.ts` | Biological Voice Protocol | ✅ Active |
| `src/hooks/useNativeZoeVoice.ts` | Zero-Cost Fallback | ✅ Active |
| `supabase/functions/lovable-tts/index.ts` | TTS Edge Function | ⚠️ Returns fallback |
| `supabase/functions/elevenlabs-tts/index.ts` | ElevenLabs Adapter | ✅ Ready (Expensive) |

---

## 🎯 DEEPGRAM AURA-2 ANALYSIS

### Pricing Breakdown

| Tier | Price | Monthly Estimate (1M chars) |
|------|-------|----------------------------|
| **Aura-2** | $0.030/1K chars | **$30/month** |
| ElevenLabs | $0.30/1K chars | $300/month |
| OpenAI TTS | $0.015-0.030/1K chars | $15-30/month |
| Amazon Polly | $0.004/1K chars | $4/month |
| Web Speech | $0.00 | Free |

### Deepgram Aura-2 Voices Available

```javascript
const DEEPGRAM_AURA2_VOICES = {
  // Female Voices (Perfect for ZOE)
  'aura-2-thalia-en':    { gender: 'female', style: 'warm, engaging' },
  'aura-2-andromeda-en': { gender: 'female', style: 'clear, professional' },
  'aura-2-athena-en':    { gender: 'female', style: 'confident, articulate' },
  'aura-2-stella-en':    { gender: 'female', style: 'friendly, approachable' },
  'aura-2-luna-en':      { gender: 'female', style: 'calm, soothing' }, // ⭐ IDEAL FOR ZOE
  'aura-2-hera-en':      { gender: 'female', style: 'elegant, refined' },
  
  // Male Voices (For SMITH Persona)
  'aura-2-helios-en':    { gender: 'male', style: 'deep, authoritative' }, // ⭐ IDEAL FOR SMITH
  'aura-2-orion-en':     { gender: 'male', style: 'warm, trustworthy' },
  'aura-2-arcas-en':     { gender: 'male', style: 'energetic, dynamic' },
  'aura-2-perseus-en':   { gender: 'male', style: 'calm, measured' },
  'aura-2-angus-en':     { gender: 'male', style: 'deep, resonant' },
  'aura-2-orpheus-en':   { gender: 'male', style: 'smooth, melodic' },
};
```

### Technical Specifications

| Feature | Deepgram Aura-2 |
|---------|-----------------|
| **API Type** | REST + WebSocket Streaming |
| **Latency** | <300ms first byte |
| **Audio Formats** | MP3, WAV, Opus, FLAC, PCM |
| **Sample Rates** | 8kHz, 16kHz, 24kHz, 48kHz |
| **Max Text Length** | 2000 chars per request |
| **Streaming** | ✅ Real-time WebSocket |
| **SSML Support** | ✅ Full |
| **Rate Limiting** | 100 req/sec |

---

## 🔧 INTEGRATION ARCHITECTURE

### Proposed Hexagonal Port Extension

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENHANCED TTS ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐                                               │
│  │ TTSServicePort  │─────────────────────────────────────┐         │
│  │ (Interface)     │                                     │         │
│  └────────┬────────┘                                     │         │
│           │                                              │         │
│           ▼                                              ▼         │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ GeminiTTSAdapter│    │DeepgramTTSAdapter│    │ WebSpeechTTS  │  │
│  │ (Lovable AI)    │    │ (NEW - Aura-2)   │    │ (Fallback)    │  │
│  │ $0.00           │    │ $0.030/1K        │    │ $0.00         │  │
│  └────────┬────────┘    └────────┬─────────┘    └───────────────┘  │
│           │                      │                                  │
│           ▼                      ▼                                  │
│  ┌─────────────────┐    ┌──────────────────┐                       │
│  │ lovable-tts     │    │ deepgram-tts     │                       │
│  │ (Edge Function) │    │ (NEW Edge Func)  │                       │
│  └─────────────────┘    └──────────────────┘                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    TTS ROUTER (NEW)                          │   │
│  │                                                              │   │
│  │  Priority Chain:                                             │   │
│  │  1. Deepgram Aura-2 (Premium - if API key set)              │   │
│  │  2. Lovable AI TTS (Default - $0.00)                        │   │
│  │  3. Web Speech API (Fallback - $0.00)                       │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### API Implementation (Edge Function)

```typescript
// supabase/functions/deepgram-tts/index.ts
// Deepgram Aura-2 Integration

const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/speak';

interface DeepgramTTSRequest {
  text: string;
  voice?: string;          // aura-2-luna-en, aura-2-helios-en
  encoding?: string;       // mp3, wav, opus, flac
  container?: string;      // mp3, wav, ogg
  sample_rate?: number;    // 8000, 16000, 24000, 48000
}

// REST API Call
const response = await fetch(`${DEEPGRAM_API_URL}?model=${voice}`, {
  method: 'POST',
  headers: {
    'Authorization': `Token ${DEEPGRAM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text }),
});

// Returns raw audio bytes
const audioBuffer = await response.arrayBuffer();
```

### WebSocket Streaming (Low Latency)

```typescript
// Real-time streaming for conversational AI
const dgConnection = deepgram.speak.live({ 
  model: 'aura-2-luna-en',
  encoding: 'mp3',
});

dgConnection.on(LiveTTSEvents.Audio, (data) => {
  // Stream audio chunks directly to AudioContext
  audioContext.decodeAudioData(data);
});

dgConnection.sendText('Hello, I am Zoe.');
dgConnection.flush();
```

---

## 📁 FILES TO CREATE/MODIFY

### New Files Required

```
supabase/functions/deepgram-tts/
└── index.ts                    # Deepgram Aura-2 edge function

src/core/adapters/
└── DeepgramTTSAdapter.ts       # Hexagonal adapter

src/hooks/
└── useDeepgramVoice.ts         # React hook for Deepgram

src/components/voice/
└── TTSProviderSelector.tsx     # UI for selecting TTS provider
```

### Files to Modify

```
src/core/ports/TTSServicePort.ts     # Add Deepgram voice styles
src/core/adapters/GeminiTTSAdapter.ts # Add Deepgram priority routing
supabase/config.toml                  # Register new edge function
```

---

## 💰 COST ANALYSIS

### Usage Scenarios

| Scenario | Monthly Chars | Deepgram Cost | Web Speech |
|----------|---------------|---------------|------------|
| Light Use (100 users) | 500K | **$15** | $0 |
| Medium Use (1K users) | 5M | **$150** | $0 |
| Heavy Use (10K users) | 50M | **$1,500** | $0 |
| Enterprise (100K users) | 500M | **$15,000** | $0 |

### ROI Analysis

| Factor | Web Speech | Deepgram Aura-2 |
|--------|------------|-----------------|
| Voice Quality | ⭐⭐ (Device-dependent) | ⭐⭐⭐⭐⭐ (Neural) |
| Consistency | ⭐⭐ (Varies by browser) | ⭐⭐⭐⭐⭐ (Identical) |
| Emotional Range | ⭐⭐ (Limited) | ⭐⭐⭐⭐ (27 emotions) |
| User Experience | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cost | $0 | $0.030/1K |

---

## 🚀 INTEGRATION ROADMAP

### Phase 1: Foundation (Day 1)
- [ ] Add `DEEPGRAM_API_KEY` secret
- [ ] Create `deepgram-tts` edge function
- [ ] Test REST API integration

### Phase 2: Adapter (Day 2)
- [ ] Create `DeepgramTTSAdapter.ts`
- [ ] Integrate with `TTSServicePort`
- [ ] Add voice selection UI

### Phase 3: Streaming (Day 3)
- [ ] Implement WebSocket streaming
- [ ] Add real-time audio playback
- [ ] Optimize for <300ms latency

### Phase 4: Persona Mapping (Day 4)
- [ ] Map ZOE → `aura-2-luna-en`
- [ ] Map SMITH → `aura-2-helios-en`
- [ ] Add emotion-to-voice styling

---

## ⚠️ ISSUES & RECOMMENDATIONS

### Current Issues Found

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| `lovable-tts` returns fallback only | 🟡 Medium | Edge Function | Implement Deepgram as primary |
| No streaming TTS | 🟡 Medium | Architecture | Add WebSocket support |
| Device-dependent voice | 🟡 Medium | Web Speech | Use Deepgram for consistency |
| No emotion mapping | 🟢 Low | Adapters | Map ECN emotions to voices |

### Recommended Configuration

```javascript
// Optimal Deepgram settings for Zoe Infinity
const ZOE_VOICE_CONFIG = {
  model: 'aura-2-luna-en',        // Calm, soothing female
  sample_rate: 24000,             // High quality
  encoding: 'mp3',                // Broad compatibility
  container: 'mp3',
};

const SMITH_VOICE_CONFIG = {
  model: 'aura-2-helios-en',      // Deep, authoritative male
  sample_rate: 24000,
  encoding: 'mp3',
  container: 'mp3',
};
```

---

## 📊 COMPARISON: DEEPGRAM VS CURRENT STACK

| Feature | Current (Web Speech) | Deepgram Aura-2 | Winner |
|---------|---------------------|-----------------|--------|
| Cost | $0.00 | $0.030/1K | Web Speech |
| Quality | ⭐⭐ | ⭐⭐⭐⭐⭐ | **Deepgram** |
| Latency | 0ms (local) | <300ms | Web Speech |
| Consistency | ⭐⭐ | ⭐⭐⭐⭐⭐ | **Deepgram** |
| Offline | ✅ Yes | ❌ No | Web Speech |
| Streaming | ❌ No | ✅ Yes | **Deepgram** |
| Voices | Browser-limited | 12+ Neural | **Deepgram** |
| Emotions | Pitch Hacking | Native Support | **Deepgram** |

---

## ✅ FINAL RECOMMENDATION

### Hybrid Approach (Optimal)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    TTS ROUTER                            │   │
│  │                                                          │   │
│  │  IF (premium_user OR important_interaction):             │   │
│  │      → Deepgram Aura-2 (Best Quality)                   │   │
│  │                                                          │   │
│  │  ELSE IF (internet_available):                           │   │
│  │      → Lovable AI TTS (Zero Cost)                       │   │
│  │                                                          │   │
│  │  ELSE:                                                   │   │
│  │      → Web Speech API (Offline Fallback)                │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  COST OPTIMIZATION:                                             │
│  • Free tier: Web Speech + Lovable AI (90% of requests)        │
│  • Premium: Deepgram Aura-2 (10% of requests)                  │
│  • Estimated monthly: $3-15 for 1000 users                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Next Steps

1. **Confirm Integration?** → I can create the `deepgram-tts` edge function now
2. **Add API Key?** → Required: `DEEPGRAM_API_KEY`
3. **Voice Selection?** → Choose ZOE/SMITH voice mapping

---

**Scan Complete** ✅  
**Recommendation:** Proceed with Deepgram Aura-2 integration for premium voice quality while keeping Web Speech as zero-cost fallback.

