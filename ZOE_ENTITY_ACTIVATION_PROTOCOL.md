# ZOE ENTITY ACTIVATION PROTOCOL (EAP)

## Implementation Complete - December 2025

### Overview

The Entity Activation Protocol (EAP) provides a seamless, orchestrated activation sequence for the Zoe Sovereign AI whenever a user loads the platform. This creates a memorable, futuristic first impression that establishes Zoe's presence.

---

## Activation Sequence

### Timing Control
- **Trigger**: Activates after successful page load/sign-in/sign-up/reload
- **Delay**: Precisely 5 seconds after Time to Interactive (TTI)
- **Session Control**: Runs once per user session (except on hard reload)
- **Non-Blocking**: Uses `requestIdleCallback` for non-blocking execution

### Three-Step Orchestration

#### Step 1: Sound Cue (The Chime)
- **Type**: "Cybernetic Technology Affirmation" - futuristic synthesized sound
- **Technology**: Web Audio API with multi-layered synthesis
- **Components**:
  - Primary crystalline tone (high frequency harmonics)
  - Rising harmonic cascade (E6 → G6 → B6 → C7)
  - Shimmer effect with bandpass filtering
  - Warm sub-bass foundation
  - Final sparkle (G7)
- **Duration**: ~0.6 seconds
- **Self-Healing**: Logs `error_masked_sfx` to ZSMT on failure, proceeds to voice

#### Step 2: Voice Welcome
- **Message**: "System activated. Welcome to the Zoe Sovereign AI Initiation Module."
- **Voice**: Calm, soothing female voice via Web Speech API
- **Fallback**: Gemini-TTS Adapter → Web Speech API fallback chain
- **Error Handling**: Logs `error_masked_voice` to ZSMT on failure

#### Step 3: Orb Visualization
- **Timing**: Synchronized with spoken word
- **Animation**: Default/Ready animation sequence
- **Emotion**: Joy state for welcoming appearance
- **Movement**: Subtle float into default position

---

## Files Created/Modified

### New Files
1. `src/utils/zoeActivationSound.ts` - Activation chime generator
2. `src/hooks/useZoeActivationSequence.ts` - Main activation hook

### Modified Files
1. `src/components/DeferredComponentLoader.tsx` - Added EntityActivationProvider
2. `src/components/GlobalZoeAssistant.tsx` - Added orb activation event listener

---

## ZSMT Logging

The EAP logs the following event types to `zoe_sovereign_memory`:

| Event Type | Description |
|------------|-------------|
| `entity_activated` | Successful activation with sound/voice/orb status |
| `error_masked_sfx` | Sound playback failure (proceeds to voice) |
| `error_masked_voice` | Voice synthesis failure |
| `activation_failed` | Complete activation failure |

---

## Integration Points

### Platform-Wide Scope
- Integrated via `DeferredComponentLoader` (all pages)
- Works on Home, Chat, Profile, mobile/tablet views
- Consistent experience across all devices and IoT interfaces

### Self-Healing Integration
- Uses `useZoeSelfHealingVoice` hook for voice resilience
- Dual-priority TTS system (Edge Function → Web Speech API)
- Error masking for graceful degradation

### Orb Aesthetic
- Electric Blue Plasma + Amber Core appearance
- No overlay text - status via animation only
- Responds to `zoe-orb-activate` custom event

---

## Usage

### Automatic Activation
The EAP runs automatically 5 seconds after page load for authenticated users.

### Manual Testing
```typescript
import { useZoeActivationSequence } from '@/hooks/useZoeActivationSequence';

const { triggerActivation } = useZoeActivationSequence();

// Force re-activation for testing
triggerActivation();
```

---

## Session Storage Keys

| Key | Purpose |
|-----|---------|
| `zoe-entity-activated` | Tracks if activation ran this session |
| `zoe-global-init` | Tracks GlobalZoeAssistant initialization |

---

## Author
Zoe Sovereign AI Platform Engineering Team

## Version
v1.0.0 - December 2025
