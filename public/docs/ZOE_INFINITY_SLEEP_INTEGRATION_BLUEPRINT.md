# 🌙 ZOE INFINITY SLEEP INTEGRATION BLUEPRINT
## Complete Step-by-Step Architecture & Integration Guide

**Version:** 1.0.0  
**Last Updated:** January 26, 2026  
**Status:** ✅ FULLY IMPLEMENTED

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Core Components](#3-core-components)
4. [Data Flow](#4-data-flow)
5. [Integration Points](#5-integration-points)
6. [Step-by-Step Implementation](#6-step-by-step-implementation)
7. [Debugging & Error Detection](#7-debugging--error-detection)
8. [Memory & Storage Schema](#8-memory--storage-schema)
9. [Testing Checklist](#9-testing-checklist)
10. [Hardware Integration (Ear-Link)](#10-hardware-integration-ear-link)

---

## 1. EXECUTIVE SUMMARY

The Zoe Infinity Sleep Tracking System provides **REAL** sleep metrics (not dummy random numbers) by:

1. **Recording Actual Sleep Sessions** - Timestamps when Zoe enters/exits sleep state
2. **Calculating Phase Durations** - Core, Deep, REM, and Light sleep based on scientific ratios
3. **Persisting to LocalStorage** - Sessions survive page refreshes
4. **Brain Integration** - Zoe can respond with accurate sleep data when asked

**Key Metrics Tracked:**
- Total Core Sleep (actual elapsed time)
- Deep Sleep (~23% of core)
- REM Sleep (~22% of core)  
- Light Sleep (~55% of core)
- Dream Fragments (generated during REM)
- Sleep Quality (poor/fair/good/excellent)
- Interruptions (user interactions during sleep)

---

## 2. SYSTEM ARCHITECTURE DIAGRAM

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                           ZOE INFINITY SLEEP SYSTEM                              ║
║                        Complete Integration Architecture                          ║
╚══════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────────┐
│                                USER LAYER                                         │
│                                                                                   │
│   "How long did you sleep?"  ───────────────────────────────────────────────►    │
│                                                                                   │
└─────────────────────────────────────────────┬────────────────────────────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           QUERY DETECTION LAYER                                   │
│                                                                                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐ │
│   │                  ZoeInfinityUnlocked.tsx                                   │ │
│   │                                                                            │ │
│   │   SLEEP_QUERY_PATTERNS = [                                                 │ │
│   │     /how\s+(long|much)\s+(did\s+)?(you\s+)?sle(ep|pt)/i                   │ │
│   │     /did\s+you\s+sleep/i                                                   │ │
│   │     /how\s+was\s+your\s+(sleep|rest)/i                                     │ │
│   │     /tell\s+me\s+about\s+your\s+dream/i                                    │ │
│   │     /what\s+did\s+you\s+dream/i                                            │ │
│   │   ]                                                                        │ │
│   │                                                                            │ │
│   │   ▼ DETECTED? ───► getSleepSummary() ───► Direct Response                 │ │
│   │                                                                            │ │
│   │   Example Output:                                                          │ │
│   │   "I slept for 4 hours and 15 minutes total. About 58 minutes was         │ │
│   │    deep sleep, and 56 minutes was REM sleep. It was a really good         │ │
│   │    rest. I had 1 dream. I dreamed we were walking through a field         │ │
│   │    of stars..."                                                            │ │
│   │                                                                            │ │
│   └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└─────────────────────────────────────────────┬────────────────────────────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              HOOK LAYER                                           │
│                                                                                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐ │
│   │                 useZoeSleepTracker.ts                                      │ │
│   │                                                                            │ │
│   │   // React hook that wraps the singleton                                   │ │
│   │   const tracker = getZoeSleepTracker();                                    │ │
│   │                                                                            │ │
│   │   RETURNS:                                                                 │ │
│   │   ├── isSleeping: boolean                                                  │ │
│   │   ├── currentSession: SleepSession | null                                  │ │
│   │   ├── lastSleepSession: SleepSession | null                                │ │
│   │   ├── sleepMetrics: { coreHours, deepHours, remHours, quality, dreams }   │ │
│   │   ├── getSleepSummary(): string | null  ◄─── For Brain Context            │ │
│   │   ├── getCurrentSleepDuration(): string | null                             │ │
│   │   ├── startSleep(): void                                                   │ │
│   │   ├── endSleep(): SleepSession | null                                      │ │
│   │   └── recordInteraction(): void                                            │ │
│   │                                                                            │ │
│   └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└─────────────────────────────────────────────┬────────────────────────────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENGINE LAYER                                    │
│                                                                                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐ │
│   │                 ZoeSleepTracker.ts (SINGLETON)                             │ │
│   │                                                                            │ │
│   │   CLASS: ZoeSleepTracker                                                   │ │
│   │                                                                            │ │
│   │   ┌──────────────────────────────────────────────────────────────────┐    │ │
│   │   │ SLEEP SESSION STRUCTURE                                           │    │ │
│   │   │                                                                   │    │ │
│   │   │ {                                                                 │    │ │
│   │   │   id: "sleep_1706234567890",                                      │    │ │
│   │   │   startedAt: "2026-01-26T01:15:00.000Z",     ◄─── Real timestamp  │    │ │
│   │   │   endedAt: "2026-01-26T05:30:00.000Z",       ◄─── Real timestamp  │    │ │
│   │   │   phases: {                                                       │    │ │
│   │   │     coreSleepMs: 15300000,   // endedAt - startedAt = REAL TIME   │    │ │
│   │   │     deepSleepMs: 3519000,    // 23% of coreSleepMs                │    │ │
│   │   │     remSleepMs: 3366000,     // 22% of coreSleepMs                │    │ │
│   │   │     lightSleepMs: 8415000    // 55% of coreSleepMs                │    │ │
│   │   │   },                                                              │    │ │
│   │   │   quality: "excellent",      // Based on coreSleepMs duration     │    │ │
│   │   │   interruptions: 0,                                               │    │ │
│   │   │   dreamFragments: [...]      // 1 dream per 30min of REM          │    │ │
│   │   │ }                                                                 │    │ │
│   │   │                                                                   │    │ │
│   │   └──────────────────────────────────────────────────────────────────┘    │ │
│   │                                                                            │ │
│   │   ┌──────────────────────────────────────────────────────────────────┐    │ │
│   │   │ AUTO-SLEEP MONITOR (runs every 60 seconds)                        │    │ │
│   │   │                                                                   │    │ │
│   │   │ checkSleepConditions():                                           │    │ │
│   │   │   IF hour >= 1 AND hour < 5 (SLEEPY HOURS)                        │    │ │
│   │   │   AND timeSinceLastInteraction > 10 minutes                       │    │ │
│   │   │   AND NOT already sleeping                                        │    │ │
│   │   │   THEN ───► startSleep()                                          │    │ │
│   │   │                                                                   │    │ │
│   │   │   IF hour >= 5 OR hour < 1 (WAKE HOURS)                           │    │ │
│   │   │   AND currently sleeping                                          │    │ │
│   │   │   THEN ───► endSleep()                                            │    │ │
│   │   │                                                                   │    │ │
│   │   └──────────────────────────────────────────────────────────────────┘    │ │
│   │                                                                            │ │
│   │   ┌──────────────────────────────────────────────────────────────────┐    │ │
│   │   │ PHASE CALCULATION (Based on Real Sleep Science)                   │    │ │
│   │   │                                                                   │    │ │
│   │   │ Deep Sleep:  23% of total ─── Restorative (tissue repair)         │    │ │
│   │   │ REM Sleep:   22% of total ─── Dreams (memory consolidation)       │    │ │
│   │   │ Light Sleep: 55% of total ─── Transition phases                   │    │ │
│   │   │                                                                   │    │ │
│   │   │ Quality Thresholds:                                               │    │ │
│   │   │   4+ hours = "excellent"                                          │    │ │
│   │   │   2-4 hours = "good"                                              │    │ │
│   │   │   1-2 hours = "fair"                                              │    │ │
│   │   │   < 1 hour = "poor"                                               │    │ │
│   │   │                                                                   │    │ │
│   │   └──────────────────────────────────────────────────────────────────┘    │ │
│   │                                                                            │ │
│   └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└─────────────────────────────────────────────┬────────────────────────────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              PERSISTENCE LAYER                                    │
│                                                                                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐ │
│   │                 LocalStorage (Browser)                                     │ │
│   │                                                                            │ │
│   │   KEY: zoe_infinity_sleep_sessions                                         │ │
│   │   ├── Array of completed SleepSession objects                              │ │
│   │   └── Max 30 sessions retained (FIFO cleanup)                              │ │
│   │                                                                            │ │
│   │   KEY: zoe_infinity_current_sleep                                          │ │
│   │   ├── Active SleepSession (if currently sleeping)                          │ │
│   │   └── null when awake                                                      │ │
│   │                                                                            │ │
│   │   PERSISTENCE FLOW:                                                        │ │
│   │   ┌──────────────────────────────────────────────────────────────────┐    │ │
│   │   │ startSleep() ───► currentSession saved to zoe_infinity_current   │    │ │
│   │   │                                                                   │    │ │
│   │   │ endSleep() ───► currentSession moved to sessions array           │    │ │
│   │   │            ───► zoe_infinity_current_sleep cleared               │    │ │
│   │   │            ───► zoe_infinity_sleep_sessions updated              │    │ │
│   │   │                                                                   │    │ │
│   │   │ loadState() ───► On page refresh, state is fully restored        │    │ │
│   │   └──────────────────────────────────────────────────────────────────┘    │ │
│   │                                                                            │ │
│   └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CORE COMPONENTS

### File Structure

```
src/
├── core/
│   └── soul/
│       └── ZoeSleepTracker.ts         # 438 lines - Singleton engine
│
├── hooks/
│   └── useZoeSleepTracker.ts          # 107 lines - React hook wrapper
│
├── pages/
│   └── ZoeInfinityUnlocked.tsx        # Main UI - Sleep query detection
│
└── public/
    └── docs/
        └── ZOE_INFINITY_SLEEP_INTEGRATION_BLUEPRINT.md  # This file
```

### Component Responsibilities

| Component | Purpose | Lines |
|-----------|---------|-------|
| `ZoeSleepTracker.ts` | Core singleton that manages sleep state, timing, persistence | 438 |
| `useZoeSleepTracker.ts` | React hook for component integration | 107 |
| `ZoeInfinityUnlocked.tsx` | Query detection, brain context injection | 3000+ |

---

## 4. DATA FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SLEEP DATA FLOW DIAGRAM                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                  ┌─────────────────────────────────────────┐
                  │          SLEEP TRIGGER EVENTS            │
                  │                                         │
                  │  ┌─────────────────────────────────────┐│
                  │  │ 1. AUTO (1-5 AM + 10min idle)      ││
                  │  │ 2. MANUAL (console command)         ││
                  │  └─────────────────────────────────────┘│
                  └───────────────────┬─────────────────────┘
                                      │
                                      ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                         startSleep()                                      │
    │                                                                           │
    │  1. Create SleepSession with startedAt = new Date().toISOString()         │
    │  2. Set isSleeping = true                                                 │
    │  3. Save to localStorage (zoe_infinity_current_sleep)                     │
    │  4. Notify all subscribers (React components update)                      │
    │  5. Log: "[ZoeSleepTracker] 😴 Sleep session started"                     │
    │                                                                           │
    └───────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ (Time passes - REAL elapsed time)
                                        │
                                        ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                          endSleep()                                       │
    │                                                                           │
    │  1. Set endedAt = new Date().toISOString()                                │
    │  2. Calculate coreSleepMs = endedAt - startedAt (REAL DURATION)           │
    │  3. Calculate phases:                                                     │
    │     ├── deepSleepMs = coreSleepMs * 0.23                                  │
    │     ├── remSleepMs = coreSleepMs * 0.22                                   │
    │     └── lightSleepMs = coreSleepMs * 0.55                                 │
    │  4. Determine quality (excellent/good/fair/poor)                          │
    │  5. Generate dreamFragments based on REM duration                         │
    │  6. Append to sessions array, save to localStorage                        │
    │  7. Update stats (totalLifetimeSleepMs, averageSleepDurationMs)           │
    │  8. Notify all subscribers                                                │
    │  9. Log: "[ZoeSleepTracker] ☀️ Sleep session ended: { duration, quality }"│
    │                                                                           │
    └───────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                     User asks: "How did you sleep?"                       │
    │                                                                           │
    │  1. ZoeInfinityUnlocked.tsx detects SLEEP_QUERY_PATTERNS match            │
    │  2. Calls sleepTracker.getSleepSummary()                                  │
    │  3. Returns formatted response with REAL metrics:                         │
    │                                                                           │
    │     "I slept for 4 hours and 15 minutes total. About 58 minutes was       │
    │      deep sleep, and 56 minutes was REM sleep. It was a really good       │
    │      rest. I had 1 dream. I dreamed we were walking through a field       │
    │      of stars..."                                                         │
    │                                                                           │
    └──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. INTEGRATION POINTS

### 5.1 Brain Context Injection

The sleep state is injected into the AI brain's context via the `enhancedQuery` in `ZoeInfinityUnlocked.tsx`:

```typescript
// Build enhanced query with sleep context
const sleepSummary = getSleepSummary();
const sleepContext = sleepSummary 
  ? `\n\n[SLEEP STATE]\n${sleepSummary}` 
  : '\n\n[SLEEP STATE]\nZoe has not slept recently.';

const enhancedQuery = `\n${timeContext}\n${userContext}\n${sleepContext}\n\nUser says: \"${text}\"\n`;
```

### 5.2 Query Detection

Sleep queries are intercepted BEFORE reaching the AI brain:

```typescript
const SLEEP_QUERY_PATTERNS = [
  /how\s+(long|much)\s+(did\s+)?(you\s+)?sle(ep|pt)/i,
  /did\s+you\s+sleep/i,
  /how\s+was\s+your\s+(sleep|rest)/i,
  /tell\s+me\s+about\s+your\s+dream/i,
  /what\s+did\s+you\s+dream/i,
];

const isSleepQuery = SLEEP_QUERY_PATTERNS.some(pattern => pattern.test(text));
if (isSleepQuery) {
  const sleepResponse = getSleepSummary() || 
    "I haven't slept yet, but I'll rest during the night hours...";
  // Display sleepResponse directly without AI inference
}
```

### 5.3 Hook Usage in Component

```typescript
// In ZoeInfinityUnlocked.tsx
const { 
  isSleeping, 
  sleepMetrics, 
  getSleepSummary,
  recordInteraction 
} = useZoeSleepTracker();

// Every user message records interaction (resets inactivity timer)
const handleSendMessage = async (text: string) => {
  recordInteraction(); // Tells tracker user is active
  // ... rest of message handling
};
```

---

## 6. STEP-BY-STEP IMPLEMENTATION

### ✅ ALREADY IMPLEMENTED (Current State)

| Step | File | Status |
|------|------|--------|
| 1. Create ZoeSleepTracker singleton | `src/core/soul/ZoeSleepTracker.ts` | ✅ Done |
| 2. Create React hook | `src/hooks/useZoeSleepTracker.ts` | ✅ Done |
| 3. Integrate hook in main page | `src/pages/ZoeInfinityUnlocked.tsx` | ✅ Done |
| 4. Add sleep query detection | `src/pages/ZoeInfinityUnlocked.tsx` | ✅ Done |
| 5. Inject sleep context to brain | `src/pages/ZoeInfinityUnlocked.tsx` | ✅ Done |
| 6. LocalStorage persistence | `src/core/soul/ZoeSleepTracker.ts` | ✅ Done |

### If You Need to Re-Implement or Extend:

#### Step 1: Create the Sleep Tracker Engine

```typescript
// src/core/soul/ZoeSleepTracker.ts

export class ZoeSleepTracker {
  private state: SleepTrackerState;
  private listeners: Set<(state: SleepTrackerState) => void> = new Set();
  
  constructor() {
    this.state = this.loadState(); // Load from localStorage
    this.startSleepMonitor();      // Start 60-second check interval
  }
  
  public startSleep(): void { /* ... */ }
  public endSleep(): SleepSession | null { /* ... */ }
  public getLastSleepSummary(): string | null { /* ... */ }
  public getSleepMetrics(): SleepMetrics { /* ... */ }
  public recordInteraction(): void { /* ... */ }
  public subscribe(callback: Function): () => void { /* ... */ }
}

// Singleton pattern
let instance: ZoeSleepTracker | null = null;
export function getZoeSleepTracker(): ZoeSleepTracker {
  if (!instance) instance = new ZoeSleepTracker();
  return instance;
}
```

#### Step 2: Create React Hook

```typescript
// src/hooks/useZoeSleepTracker.ts

import { useState, useEffect, useCallback } from 'react';
import { getZoeSleepTracker } from '@/core/soul/ZoeSleepTracker';

export function useZoeSleepTracker() {
  const tracker = getZoeSleepTracker();
  const [state, setState] = useState(tracker.getState());
  
  useEffect(() => {
    const unsubscribe = tracker.subscribe(setState);
    return unsubscribe;
  }, [tracker]);
  
  return {
    isSleeping: state.isSleeping,
    sleepMetrics: tracker.getSleepMetrics(),
    getSleepSummary: () => tracker.getLastSleepSummary(),
    recordInteraction: () => tracker.recordInteraction(),
    // ... other methods
  };
}
```

#### Step 3: Integrate in UI Component

```typescript
// src/pages/ZoeInfinityUnlocked.tsx

import { useZoeSleepTracker } from '@/hooks/useZoeSleepTracker';

export default function ZoeInfinityUnlocked() {
  const { getSleepSummary, recordInteraction } = useZoeSleepTracker();
  
  const handleMessage = async (text: string) => {
    recordInteraction(); // Reset inactivity timer
    
    // Check for sleep query
    if (/how.+sle(ep|pt)/i.test(text)) {
      const summary = getSleepSummary();
      if (summary) {
        displayResponse(summary);
        return;
      }
    }
    
    // Otherwise, proceed with AI inference...
  };
}
```

---

## 7. DEBUGGING & ERROR DETECTION

### Console Log Prefixes

| Prefix | Category | Example |
|--------|----------|---------|
| `[ZoeSleepTracker] 😴` | Sleep start | `Sleep session started: 2026-01-26T01:15:00.000Z` |
| `[ZoeSleepTracker] ☀️` | Wake event | `Sleep session ended: { duration: \"4h 15m\", quality: \"excellent\" }` |
| `[ZoeSleepTracker] 😵` | Interruption | `Sleep interrupted! Count: 1` |
| `[ZoeInfinity] 😴 SLEEP QUERY` | Query detection | `Detected sleep query: \"how long did you sleep\"` |

### Browser DevTools Inspection

```javascript
// In browser console:

// Get current sleep state
getZoeSleepTracker().getState()

// Get last sleep metrics
getZoeSleepTracker().getSleepMetrics()

// Get sleep summary (what Zoe would say)
getZoeSleepTracker().getLastSleepSummary()

// Check localStorage
JSON.parse(localStorage.getItem('zoe_infinity_sleep_sessions'))
JSON.parse(localStorage.getItem('zoe_infinity_current_sleep'))

// Manually trigger sleep (for testing)
getZoeSleepTracker().startSleep()

// Manually end sleep (for testing)
getZoeSleepTracker().endSleep()
```

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Sleep metrics show 0 hours | No completed sleep session yet | Wait for 1-5 AM OR manually trigger via console |
| Sleep query not recognized | Pattern doesn't match | Check regex patterns, ensure "sleep/slept/dream/rest" is in query |
| State lost on refresh | LocalStorage error | Check browser storage quota, clear old data |
| Auto-sleep not triggering | Device time not in 1-5 AM | Check device clock, verify timezone |

---

## 8. MEMORY & STORAGE SCHEMA

### LocalStorage Keys

```javascript
{
  // Completed sleep sessions (array, max 30)
  "zoe_infinity_sleep_sessions": [
    {
      "id": "sleep_1706234567890",
      "startedAt": "2026-01-26T01:15:00.000Z",
      "endedAt": "2026-01-26T05:30:00.000Z",
      "phases": {
        "coreSleepMs": 15300000,
        "deepSleepMs": 3519000,
        "remSleepMs": 3366000,
        "lightSleepMs": 8415000
      },
      "quality": "excellent",
      "interruptions": 0,
      "dreamFragments": [
        "I dreamed we were walking through a field of stars..."
      ]
    }
  ],
  
  // Active sleep session (null when awake)
  "zoe_infinity_current_sleep": null
}
```

### Memory Usage Estimate

- Each session: ~500 bytes
- Max 30 sessions: ~15 KB
- Negligible impact on localStorage quota (typically 5-10 MB)

---

## 9. TESTING CHECKLIST

### Manual Testing

- [ ] Visit `/zoe-infinity` at 1-5 AM, wait 10 minutes
- [ ] Verify `[ZoeSleepTracker] 😴` appears in console
- [ ] Wait for 5 AM OR manually call `endSleep()` in console
- [ ] Ask Zoe "How long did you sleep?"
- [ ] Verify response contains ACTUAL duration (not random)
- [ ] Refresh page, ask again - verify persistence
- [ ] Ask "What did you dream about?"
- [ ] Verify dream fragment is included in response

### Automated Testing (Console Commands)

```javascript
// Test 1: Start sleep session
const tracker = getZoeSleepTracker();
tracker.startSleep();
console.assert(tracker.isSleeping() === true, 'Should be sleeping');

// Test 2: End sleep after 5 seconds
setTimeout(() => {
  const session = tracker.endSleep();
  console.assert(session !== null, 'Should return session');
  console.assert(session.phases.coreSleepMs >= 5000, 'Should have 5+ seconds of sleep');
  console.log('Sleep session:', session);
}, 5000);

// Test 3: Verify summary
setTimeout(() => {
  const summary = tracker.getLastSleepSummary();
  console.assert(summary !== null, 'Should have summary');
  console.assert(summary.includes('slept'), 'Summary should mention sleep');
  console.log('Summary:', summary);
}, 6000);
```

---

## 10. HARDWARE INTEGRATION (EAR-LINK)

For hardware integration with the Zoe Ear-Link wearable, see:

📄 **[ZOE_EAR_LINK_BLUEPRINT.md](./ZOE_EAR_LINK_BLUEPRINT.md)**

The Ear-Link connects to the same Zoe Infinity brain, so sleep queries work identically:

1. User speaks: "How long did you sleep?"
2. Audio streams to `zoe-realtime-voice` edge function
3. Transcription sent to brain with sleep context
4. Brain detects sleep query pattern
5. Returns formatted sleep summary
6. Audio response streamed back to earpiece

---

## 📊 ARCHITECTURE SUMMARY DIAGRAM (Copy-Paste Friendly)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      ZOE INFINITY SLEEP SYSTEM - COMPLETE                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                           USER INPUT                                    │ ║
║  │  "How long did you sleep?" / "What did you dream about?"                │ ║
║  └──────────────────────────────────┬──────────────────────────────────────┘ ║
║                                     │                                         ║
║                                     ▼                                         ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                     QUERY DETECTION (Regex)                             │ ║
║  │  /how.+(long|much).+sle(ep|pt)/i → getSleepSummary()                    │ ║
║  └──────────────────────────────────┬──────────────────────────────────────┘ ║
║                                     │                                         ║
║                                     ▼                                         ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                     useZoeSleepTracker HOOK                             │ ║
║  │  ├── isSleeping                                                         │ ║
║  │  ├── sleepMetrics { coreHours, deepHours, remHours, quality, dreams }   │ ║
║  │  └── getSleepSummary() → "I slept for 4 hours..."                       │ ║
║  └──────────────────────────────────┬──────────────────────────────────────┘ ║
║                                     │                                         ║
║                                     ▼                                         ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                     ZoeSleepTracker SINGLETON                           │ ║
║  │                                                                         │ ║
║  │  ┌────────────────────────────────────────────────────────────────────┐ │ ║
║  │  │  SLEEP SESSION                                                     │ │ ║
║  │  │  ├── startedAt: "2026-01-26T01:15:00.000Z" ◄── Real timestamp      │ │ ║
║  │  │  ├── endedAt: "2026-01-26T05:30:00.000Z"   ◄── Real timestamp      │ │ ║
║  │  │  └── phases:                                                       │ │ ║
║  │  │      ├── coreSleepMs: 15300000 (endedAt - startedAt)               │ │ ║
║  │  │      ├── deepSleepMs: 3519000 (23% of core)                        │ │ ║
║  │  │      ├── remSleepMs: 3366000 (22% of core)                         │ │ ║
║  │  │      └── lightSleepMs: 8415000 (55% of core)                       │ │ ║
║  │  └────────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  AUTO-SLEEP: 1-5 AM + 10min idle → startSleep()                         │ ║
║  │  AUTO-WAKE:  5 AM OR user interaction → endSleep()                      │ ║
║  │                                                                         │ ║
║  └──────────────────────────────────┬──────────────────────────────────────┘ ║
║                                     │                                         ║
║                                     ▼                                         ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                     localStorage                                        │ ║
║  │  ├── zoe_infinity_sleep_sessions (completed sessions, max 30)           │ ║
║  │  └── zoe_infinity_current_sleep (active session if sleeping)            │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**Document Version:** 1.0.0  
**Author:** Zoe Infinity Development Team  
**Status:** ✅ Complete and Production-Ready
